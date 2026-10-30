#!/usr/bin/env python3
"""Sprout-Char: handwritten conditional neural character generator, random init.
No pretrained weights, autograd framework, retrieval index or response lookup.
"""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
os.environ.setdefault('OMP_NUM_THREADS','1')
import argparse,hashlib,json,math,time,unicodedata,base64
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'src' if (ROOT/'src/index.html').is_file() else ROOT

def normalize(s):return unicodedata.normalize('NFKC',s).lower().strip()

def make_data():
    rows=json.loads((ROOT/'self-model/data.json').read_text())
    vocab=['<pad>','<bos>','<eos>','<unk>']+sorted(set(''.join(normalize(r['q'])+r['a'] for r in rows)))
    table={c:i for i,c in enumerate(vocab)}
    return rows,vocab,table

def init(rng,V,Q=48,E=16,C=24,H=192):
    def rand(shape,scale):return (rng.standard_normal(shape)*scale).astype(np.float32)
    return {'qe':rand((V,Q),.12),'ce':rand((V,E),.12),'w1':rand((Q+C*E,H),1/math.sqrt(Q+C*E)),
            'b1':np.zeros(H,np.float32),'w2':rand((H,V),1/math.sqrt(H)), 'b2':np.zeros(V,np.float32)}

def forward(p,q,c):
    mask=(q!=0).astype(np.float32)
    denom=np.sqrt(np.maximum(mask.sum(1,keepdims=True),1))
    xq=(p['qe'][q]*mask[:,:,None]).sum(1)/denom
    xc=p['ce'][c].reshape(len(c),-1)
    x=np.concatenate([xq,xc],axis=1)
    h=np.tanh(x@p['w1']+p['b1'])
    z=h@p['w2']+p['b2'];z-=z.max(1,keepdims=True)
    probs=np.exp(z);probs/=probs.sum(1,keepdims=True)
    return probs,(mask,denom,x,h)

def backward(p,q,c,y,probs,cache):
    mask,denom,x,h=cache;B=len(y)
    dz=probs.copy();dz[np.arange(B),y]-=1;dz/=B
    grads={'w2':h.T@dz,'b2':dz.sum(0)}
    dh=(dz@p['w2'].T)*(1-h*h)
    grads.update(w1=x.T@dh,b1=dh.sum(0))
    dx=dh@p['w1'].T;Q=p['qe'].shape[1]
    grads['qe']=np.zeros_like(p['qe']);grads['ce']=np.zeros_like(p['ce'])
    dqe=dx[:,:Q]/denom
    np.add.at(grads['qe'],q,(dqe[:,None,:]*mask[:,:,None]))
    np.add.at(grads['ce'],c,dx[:,Q:].reshape(len(c),c.shape[1],-1))
    return grads

def gradient_check():
    rng=np.random.default_rng(7);p=init(rng,9,4,3,3,5)
    q=np.array([[4,5,0],[6,5,4]]);c=np.array([[0,1,4],[1,5,6]]);y=np.array([5,7])
    probs,cache=forward(p,q,c);g=backward(p,q,c,y,probs,cache)
    worst=0
    for name in p:
        a=p[name];flat=a.flat
        for idx in rng.choice(a.size,min(a.size,5),replace=False):
            old=flat[idx];eps=.002
            flat[idx]=old+eps;pos=-np.log(forward(p,q,c)[0][np.arange(2),y]).mean()
            flat[idx]=old-eps;neg=-np.log(forward(p,q,c)[0][np.arange(2),y]).mean()
            flat[idx]=old
            numeric=(pos-neg)/(2*eps);error=abs(float(numeric-g[name].flat[idx]));worst=max(worst,error)
            if error>.0003:raise AssertionError((name,idx,float(numeric),float(g[name].flat[idx])))
    print('PASS numerical gradient check; max absolute error',worst,flush=True)

def generate(p,table,qtext,context=24,qlen=96,maxnew=140):
    ids=[table.get(c,3) for c in normalize(qtext)][-qlen:]
    q=np.array([ids+[0]*(qlen-len(ids))]);c=[0]*(context-1)+[1];out=[]
    for _ in range(maxnew):
        probs,_=forward(p,q,np.array([c]));probs[0,0]=0;probs[0,1]=0;probs[0,3]=0
        token=int(probs[0].argmax())
        if token==2:break
        out.append(token);c=c[1:]+[token]
    inv={v:k for k,v in table.items()}
    return ''.join(inv[t] for t in out)

def export(p,vocab,steps,loss):
    folder=SITE/'sprout';folder.mkdir(exist_ok=True)
    offset=0;shapes={};parts=[]
    for n,a in p.items():
        shapes[n]={'shape':list(a.shape),'offset':offset,'length':int(a.size)}
        parts.append(a.astype('<f4').tobytes());offset+=a.size
    weights=b''.join(parts);(folder/'weights.bin').write_bytes(weights)
    (folder/'weights.b64').write_text(base64.b64encode(weights).decode()+'\n')
    config={'name':'Sprout-Char','version':'0.1','architecture':'conditional-mlp-character-lm','origin':'random-initialization; no pretrained weights',
            'weightsEncoding':'base64','vocab':vocab,'context':24,'questionLength':96,'tensors':shapes,'parameters':offset,'steps':steps,'trainLoss':loss,
            'weightsSha256':hashlib.sha256(weights).hexdigest(),'corpusSha256':hashlib.sha256((ROOT/'self-model/data.json').read_bytes()).hexdigest(),
            'limitations':'Experimental tiny character generator. No guaranteed arithmetic, factual accuracy or robust dialogue understanding.'}
    (folder/'config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
    return config

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--steps',type=int,default=10000);ap.add_argument('--check-only',action='store_true');ap.add_argument('--resume',action='store_true');args=ap.parse_args()
    gradient_check()
    if args.check_only:return
    if not 1<=args.steps<=100000:raise ValueError('steps must be 1..100000')
    rows,vocab,table=make_data();V=len(vocab);rng=np.random.default_rng(20261030)
    p=init(rng,V);m={n:np.zeros_like(a) for n,a in p.items()};v={n:np.zeros_like(a) for n,a in p.items()}
    folder=ROOT/'artifacts/model-training';folder.mkdir(parents=True,exist_ok=True);checkpoint=folder/'checkpoint.npz';start=0
    if args.resume:
        ck=np.load(checkpoint,allow_pickle=False);start=int(ck['step']);
        for n in p:
            if ck['p_'+n].shape!=p[n].shape:raise ValueError('Checkpoint shape changed; train from scratch after editing data')
            p[n]=ck['p_'+n].copy();m[n]=ck['m_'+n].copy();v[n]=ck['v_'+n].copy()
    questions=[];contexts=[];targets=[]
    for row in rows:
        ids=[table.get(c,3) for c in normalize(row['q'])][-96:];q=ids+[0]*(96-len(ids));history=[0]*23+[1]
        for token in [table[c] for c in row['a']]+[2]:
            questions.append(q);contexts.append(history.copy());targets.append(token);history=history[1:]+[token]
    qs=np.array(questions,np.int32);cs=np.array(contexts,np.int32);ys=np.array(targets,np.int32)
    print(json.dumps({'vocab':V,'parameters':sum(a.size for a in p.values()),'examples':len(ys),'steps':args.steps}),flush=True)
    started=time.time();ema=None;report=[]
    # Mix uniform token samples with first-answer-token samples to learn prompt conditioning.
    first=np.flatnonzero(cs[:,-1]==1)
    for step in range(start+1,start+args.steps+1):
        ix=rng.integers(len(ys),size=96);ix[:12]=rng.choice(first,size=12)
        q,c,y=qs[ix],cs[ix],ys[ix]
        probs,cache=forward(p,q,c);loss=float(-np.log(np.maximum(probs[np.arange(len(y)),y],1e-10)).mean());ema=loss if ema is None else .98*ema+.02*loss
        grads=backward(p,q,c,y,probs,cache)
        lr=.002 if step<8000 else .0006
        for n in p:
            g=np.clip(grads[n],-1,1);m[n]*=.9;m[n]+=.1*g;v[n]*=.999;v[n]+=.001*g*g
            p[n]-=lr*(m[n]/(1-.9**step))/(np.sqrt(v[n]/(1-.999**step))+1e-8)
        if step%500==0 or step==start+args.steps:
            line={'step':step,'loss_ema':round(ema,5),'seconds':round(time.time()-started,1)};report.append(line);print(json.dumps(line),flush=True)
        if step%2500==0 or step==start+args.steps:
            np.savez(checkpoint,step=np.array(step),**{'p_'+n:a for n,a in p.items()},**{'m_'+n:a for n,a in m.items()},**{'v_'+n:a for n,a in v.items()})
            export(p,vocab,step,ema)
    probes=['你好呀','請問一加一等於多少？','1+1等於幾？','星星有幾個角？','我想學Python','JavaScript是什麼','我今天很累','請介紹你自己','量子糾纏是什麼','8+9等於多少','2+3等於幾']
    outputs={q:generate(p,table,q) for q in probes}
    print(json.dumps(outputs,ensure_ascii=False,indent=2),flush=True)
    (folder/'training-report.json').write_text(json.dumps({'progress':report,'probes':outputs,'parameters':sum(a.size for a in p.values()),'vocab':V},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()

/* Sprout-Char inference, implemented for this project. No retrieval or response table. */
(function(root){
'use strict';
function normalized(text){return text.normalize('NFKC').toLowerCase().trim();}
class SproutLM {
  constructor(config,buffer){
    if(config.architecture!=='conditional-mlp-character-lm'||config.context!==24||config.questionLength!==96)throw Error('不支援的模型格式');
    this.config=config;this.vocab=config.vocab;this.ids=new Map(this.vocab.map((c,i)=>[c,i]));
    if(buffer.byteLength!==config.parameters*4)throw Error('模型權重大小不符');
    this.weights={};
    for(const [name,spec]of Object.entries(config.tensors)){
      if(spec.offset<0||spec.length<0||(spec.offset+spec.length)*4>buffer.byteLength)throw Error('模型矩陣範圍不符');
      this.weights[name]=new Float32Array(buffer,spec.offset*4,spec.length);
    }
    const V=this.vocab.length,Q=config.tensors.qe.shape[1],E=config.tensors.ce.shape[1],H=config.tensors.b1.length;
    this.V=V;this.Q=Q;this.E=E;this.H=H;this.D=Q+config.context*E;
    const expected={qe:[V,Q],ce:[V,E],w1:[this.D,H],b1:[H],w2:[H,V],b2:[V]};
    for(const[name,shape]of Object.entries(expected)){
      const spec=config.tensors[name];
      if(!spec||String(spec.shape)!==String(shape)||spec.length!==shape.reduce((a,b)=>a*b,1))throw Error('模型矩陣形狀不符');
    }
  }
  start(text){
    const chars=[...normalized(text)].slice(-this.config.questionLength);
    const q=chars.map(c=>this.ids.get(c)??3);
    const vector=new Float32Array(this.Q);
    const scale=1/Math.sqrt(Math.max(q.length,1));
    for(const token of q)for(let j=0;j<this.Q;j++)vector[j]+=this.weights.qe[token*this.Q+j]*scale;
    return {q:vector,context:Array(this.config.context-1).fill(0).concat(1),tokens:[],unknown:q.filter(t=>t===3).length,characters:q.length};
  }
  next(state){
    const {Q,E,H,V,D,weights:p}=this;
    const x=new Float32Array(D);x.set(state.q);
    for(let i=0;i<state.context.length;i++)for(let j=0;j<E;j++)x[Q+i*E+j]=p.ce[state.context[i]*E+j];
    const h=new Float64Array(H);for(let j=0;j<H;j++)h[j]=p.b1[j];
    for(let i=0;i<D;i++){const a=x[i],offset=i*H;for(let j=0;j<H;j++)h[j]+=a*p.w1[offset+j];}
    for(let j=0;j<H;j++)h[j]=Math.tanh(h[j]);
    const logits=new Float64Array(V);for(let k=0;k<V;k++)logits[k]=p.b2[k];
    for(let j=0;j<H;j++){const a=h[j],offset=j*V;for(let k=0;k<V;k++)logits[k]+=a*p.w2[offset+k];}
    let token=2,best=logits[2];
    for(let k=4;k<V;k++)if(logits[k]>best){best=logits[k];token=k;}
    let total=0;for(let k=2;k<V;k++)if(k!==3)total+=Math.exp(logits[k]-best);
    const probability=1/total;
    if(token!==2){state.context.shift();state.context.push(token);state.tokens.push(token);}
    return {token,text:token===2?'':this.vocab[token],done:token===2,probability};
  }
}
const api={SproutLM,normalized};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Sprout=api;
})(globalThis);

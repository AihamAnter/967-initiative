export const MORSE_ALPHABET=Object.freeze({
 A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
 0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'
});
const REVERSE=Object.fromEntries(Object.entries(MORSE_ALPHABET).map(([char,code])=>[code,char]));
export function encodeMorse(input){
 if(typeof input!=='string'||input.length>30||!/^[A-Z0-9 ]*$/i.test(input))throw Error('Use A-Z and 0-9');
 return input.trim().toUpperCase().split(/ +/).filter(Boolean)
  .map(word=>[...word].map(letter=>MORSE_ALPHABET[letter]).join(' ')).join(' / ');
}
export function decodeMorse(code){
 if(typeof code!=='string'||code.length>180||!/^[.\-/ ]*$/.test(code))throw Error('Invalid Morse');
 return code.trim().split(/\s*\/\s*/).map(word=>word.trim().split(/ +/).filter(Boolean)
  .map(symbol=>REVERSE[symbol]||'�').join('')).join(' ');
}
export const GATE_TYPES=['BUFFER','AND','OR','NOT','NAND','NOR','XOR','XNOR','HALF_ADDER'];
export function evaluateGate(type,a,b=0){
 if(!GATE_TYPES.includes(type)||![0,1].includes(a)||![0,1].includes(b))throw Error('Invalid logic gate');
 switch(type){
  case 'BUFFER':return {out:a};
  case 'NOT':return {out:1-a};
  case 'AND':return {out:a&b};
  case 'OR':return {out:a|b};
  case 'NAND':return {out:1-(a&b)};
  case 'NOR':return {out:1-(a|b)};
  case 'XOR':return {out:a^b};
  case 'XNOR':return {out:1-(a^b)};
  case 'HALF_ADDER':return {out:a^b,carry:a&b};
 }
}
export function gateTruthTable(type){
 const aOnly=type==='BUFFER'||type==='NOT';
 const inputs=aOnly?[[0,0],[1,0]]:[[0,0],[0,1],[1,0],[1,1]];
 return inputs.map(([a,b])=>({a,b,...evaluateGate(type,a,b)}));
}

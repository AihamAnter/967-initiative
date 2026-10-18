import {toLatinDigits} from './format.js';

export function whatsappUrl(number, message = '') {
  if (typeof number !== 'string' || !/^[+\d\s().-]+$/.test(toLatinDigits(number))) return null;
  let digits=toLatinDigits(number).replace(/\D/g,'').replace(/^00/,'');
  if (/^7\d{8}$/.test(digits)) digits='967'+digits;
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  return 'https://wa.me/'+digits+(message?'?text='+encodeURIComponent(message):'');
}

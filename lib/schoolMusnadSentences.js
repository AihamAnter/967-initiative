// Modern Arabic sentences for a pedagogical script-transliteration exercise.
// These are NOT attested sentences in the ancient Sabaean language.
export const MUSNAD_FINAL_SENTENCES=[
 'اليمن دولة قديمة في التاريخ',
 'صنعاء مدينة ذات تاريخ عريق',
 'الخط القديم يحفظ تراث اليمن',
 'العلم يفتح ابواب المعرفة',
 'البحر يحيط بسواحل اليمن',
 'النجوم تهدي المسافر ليلا',
 'اللغة تحفظ ذاكرة الشعوب',
 'الكتب تنقل العلم بين الناس',
 'الشمس تشرق كل صباح',
 'النقوش تحكي تاريخ المدن',
 'اليمن موطن حضارات قديمة',
 'القراءة تنمي الفكر والخيال',
 'المعرفة تبني مستقبل الانسان',
 'الحروف تحفظ قصص الماضي',
 'الشعر فن قديم في اليمن',
 'العلم نور يهدي الانسان',
 'اليمن ارض الجبال والبحار',
 'التاريخ يعلمنا دروسا كثيرة',
 'المدن القديمة تروي الحكايات',
 'العقل يفكر والقلم يكتب'
];

const letters={
 'ا':'alef','أ':'alef','إ':'alef','آ':'alef','ٱ':'alef','ء':'alef',
 'ب':'b','ت':'t','ث':'th','ج':'g','ح':'hh','خ':'kh',
 'د':'d','ذ':'dh','ر':'r','ز':'z','س':'s1','ش':'sh',
 'ص':'ss','ض':'dd','ط':'tt','ظ':'zz','ع':'ayn','غ':'gh',
 'ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n',
 'ه':'h','ة':'h','و':'w','ؤ':'w','ي':'y','ى':'y','ئ':'y'
};
export function musnadSentenceIds(sentence){
 const words=sentence.normalize('NFC').replace(/[\u064B-\u065F\u0670]/gu,'').trim().split(/\s+/u);
 if(words.length<3)throw Error('A full sentence requires at least three words');
 const answer=words.flatMap((word,i)=>{
  const glyphs=[...word].map(letter=>{
   if(!Object.hasOwn(letters,letter))throw Error('Unsupported Arabic character in Musnad sentence: '+letter);
   return letters[letter];
  });
  return i<words.length-1?[...glyphs,'sep']:glyphs;
 });
 if(answer.length>80)throw Error('Sentence exceeds the available learning keyboard');
 return answer;
}

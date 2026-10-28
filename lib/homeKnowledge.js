import {pageIsVisible} from './pageVisibility.js';

// Editorial discovery routes, not a second navigation menu.
// Each item respects the same publication/visibility settings as the header.
export const homeKnowledgeDestinations=[
 {id:'history',href:'/yemen-history',title:'تاريخ اليمن',eyebrow:'عبر العصور',description:'من الممالك القديمة إلى اليمن المعاصر، أحداث ودول ومواقع وشواهد تاريخية.'},
 {id:'atlas',href:'/yemen-map',title:'خريطة اليمن',eyebrow:'الأرض والمكان',description:'تجوّل بين المحافظات والمديريات، واقترب من الأماكن ومعالمها.'},
 {id:'figures',href:'/yemeni-figures',title:'شخصيات يمنية',eyebrow:'أسماء تركت أثراً',description:'تعرّف إلى شخصيات من مجالات وعصور ومحافظات مختلفة.'},
 {id:'statistics',href:'/yemen-in-numbers',title:'اليمن بالأرقام',eyebrow:'البيانات الوطنية',description:'اقرأ المؤشرات مع سنة القياس والمصدر، وافهم ما تقوله الأرقام.'},
 {id:'ranking',href:'/yemen-ranking',title:'ترتيب اليمن',eyebrow:'اليمن والعالم',description:'اكتشف موقع اليمن في المؤشرات الدولية وقارنه بالدول الأخرى.'},
];
export function visibleHomeKnowledge(visibility={},contentPages=[]){
 return homeKnowledgeDestinations.filter(item=>pageIsVisible(item.href,visibility,contentPages));
}

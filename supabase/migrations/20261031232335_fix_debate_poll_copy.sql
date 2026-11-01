-- Correct only the malformed option in the named test debate. The option ID
-- remains unchanged so any existing votes keep their referential identity.
update public.debate_poll_options as option
set label = 'أؤيد التحول الرقمي الكامل خلال خمس سنوات'
from public.debates as debate
where option.debate_id = debate.id
  and debate.slug = 'yemen-digital-services-test'
  and option.position = 0
  and option.label = 'هل تؤيد التحول الرقمي الكامل للخدمات الحكومية في اليمن خلال خمس سنوات؟  الخيارات:  نعم، أؤيد التحول الرقمي الكامل خلال خمس سنوات';

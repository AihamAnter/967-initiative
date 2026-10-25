export function revealInvalidField(event) {
  let parent=event.target.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
}
export function trackEditorFiles(event,editor) {
  if(event.target.type==='file')editor.setHasFiles([...event.currentTarget.querySelectorAll('input[type=file]')].some(input=>input.files?.length));
}
export function publicationIntent(event,fallback=false) {
  const submitter=event.nativeEvent?.submitter;
  return submitter?.name==='publicationIntent'?submitter.value==='publish':Boolean(fallback);
}

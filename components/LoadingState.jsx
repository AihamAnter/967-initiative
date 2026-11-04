export default function LoadingState({
  title='نجهّز الصفحة لك…',
  description='لحظات قليلة بينما نجمع المحتوى ونرتّبه للعرض.',
  compact=false,
  className='',
}) {
  const classes=['ed-loading-state',compact&&'ed-loading-state--compact',className].filter(Boolean).join(' ');
  return <div className={classes} role="status" aria-live="polite" aria-busy="true">
    <div className="ed-loading-mark" aria-hidden="true"><span>967</span></div>
    <div className="ed-loading-copy">
      <strong>{title}</strong>
      {description&&<span>{description}</span>}
    </div>
    <div className="ed-loading-lines" aria-hidden="true"><i/><i/><i/></div>
  </div>;
}

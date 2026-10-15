export default function YemenNumbersLoading() {
  return <section className="stat-loading"><div className="container"><span className="eyebrow">اليمن بالأرقام</span><div className="stat-loading-line wide"/><div className="stat-loading-line"/><div className="stat-loading-grid">{Array.from({length: 6}, (_, index) => <div key={index}/>)}</div></div></section>;
}

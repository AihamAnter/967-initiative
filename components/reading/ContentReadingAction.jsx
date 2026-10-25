import SaveForLater from './SaveForLater';

export default function ContentReadingAction({kind,href,title}) {
  return <div className="content-reading-action"><SaveForLater item={{kind,href,title}}/></div>;
}

import Image from 'next/image';

export default function DebateLogo({className='',priority=false,decorative=false,sizes='64px'}) {
 return <Image src="/images/debates-logo.png" alt={decorative?'':'مناظرات 967'} width={1254} height={1254} sizes={sizes} priority={priority} className={`debate-logo ${className}`.trim()}/>;
}

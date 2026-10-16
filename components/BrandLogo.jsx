import Image from 'next/image';

// The initiative's original mark, shared by every brand placement.
export default function BrandLogo({light = false, className = '', priority = false}) {
  return <Image src="/images/967%20logo%20no%20background.png" alt="مبادرة 967" width={1717} height={1814} sizes="64px" priority={priority} className={`brand-logo ${light ? 'brand-logo-light' : ''} ${className}`}/>;
}

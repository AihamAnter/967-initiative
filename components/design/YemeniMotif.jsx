// An original geometric ornament inspired by the fan-shaped panes of a
// qamariya. It is decorative and never conveys content or blocks interaction.
export default function YemeniMotif({className = ''}) {
  return <svg className={`yemeni-motif ${className}`.trim()} viewBox="0 0 200 130" fill="none" aria-hidden="true" focusable="false">
    <path d="M12 116V100a88 88 0 0 1 176 0v16H12Z" stroke="currentColor" strokeWidth="3"/>
    <path d="M28 100a72 72 0 0 1 144 0H28Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M100 100V28M100 100 49 49M100 100 151 49M100 100 34 72M100 100 166 72" stroke="currentColor" strokeWidth="2"/>
    <path d="M70 100a30 30 0 0 1 60 0M12 124h176" stroke="currentColor" strokeWidth="3"/>
    <circle cx="100" cy="14" r="5" fill="currentColor"/>
    <path d="m19 35 5-5 5 5-5 5-5-5Zm152 0 5-5 5 5-5 5-5-5Z" fill="currentColor"/>
  </svg>;
}

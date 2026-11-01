import type { ReactNode } from 'react'

type SectionHeadingProps = {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'} ${className}`}>
      <span className="eyebrow">
        <span className="h-1 w-1 rounded-full bg-mint-400" />
        {eyebrow}
      </span>
      <h2 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.6rem] lg:text-[3rem]">
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-[14.5px] leading-relaxed text-mist sm:text-[15.5px] ${centered ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
    </div>
  )
}

import { ArrowRight, Boxes, Check, Compass } from 'lucide-react'
import { IsoCampus } from '../components/IsoCampus'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { rooms } from '../data/content'

export function Metaverse() {
  return (
    <section id="campus" className="section-pad relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-brand-500/[0.1] blur-[140px]"
      />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="3D Metaverse Alumni Hub"
            title={
              <>
                Step into the future of
                <br className="hidden sm:block" /> <span className="gradient-text">alumni collaboration.</span>
              </>
            }
            description="A browser-based virtual campus where alumni, students and professionals connect, discover challenges, showcase projects and join mentorship activities — without VR hardware."
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="gradient-border mt-12 overflow-hidden rounded-[2rem] bg-ink-900/45">
            <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative p-6 sm:p-9">
                <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-50" />
                <div className="relative">
                  <span className="demo-note">
                    <Boxes className="h-3 w-3 text-brand-300" />
                    Browser-based · no headset required
                  </span>

                  <h3 className="mt-4 text-[1.4rem] font-semibold leading-snug sm:text-2xl">
                    One lobby. Five connected spaces.
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-mist">
                    Walk into a room and you open the same records you use on the 2D platform. The 3D hub is a
                    front door, not a separate application — clicking Challenge Arena loads live challenges, and
                    the Innovation Lab opens approved portfolios.
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {[
                      'Central lobby with clickable room entrances',
                      'Live data from the same backend APIs',
                      'Every feature stays fully usable in 2D',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[11.5px] text-mist">
                        <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-mint-400" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <a href="/metaverse/index.html" className="btn-primary group !py-2.5 !text-[12.5px]" target="_blank" rel="noopener noreferrer">
                      Enter virtual campus
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </a>
                    <a href="#challenges" className="btn-secondary !py-2.5 !text-[12.5px]">
                      Preview the Arena
                    </a>
                  </div>

                  <p className="mt-4 flex items-center gap-1.5 text-[10px] text-ash">
                    <Compass className="h-3 w-3" />
                    MVP focus: lobby, Challenge Arena and Innovation Lab. Other spaces follow.
                  </p>
                </div>
              </div>

              <div className="relative flex items-center justify-center border-t border-white/[0.06] bg-ink-950/40 p-3 sm:p-6 lg:border-l lg:border-t-0">
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(242,149,89,0.16),transparent_65%)]" />
                <div className="relative w-full max-w-[460px]">
                  <IsoCampus />
                  <div className="absolute bottom-2 left-2 rounded-lg border border-[rgba(242,149,89,0.2)] bg-ink-900/90 px-2 py-1 text-[9px] text-mist backdrop-blur">
                    <span className="mr-1 inline-block h-1 w-1 rounded-full bg-mint-400" />
                    Central lobby
                  </div>
                  <div className="absolute right-2 top-2 rounded-lg border border-[rgba(242,149,89,0.2)] bg-ink-900/90 px-2 py-1 text-[9px] text-mist backdrop-blur">
                    Interactive preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {rooms.map((room, index) => (
            <Reveal key={room.name} delay={index * 50}>
              <article className="card card-hover group h-full p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-[rgba(242,149,89,0.18)] bg-white/[0.03]">
                    <room.icon className={`h-3.5 w-3.5 ${room.accent}`} />
                  </span>
                  <span className="font-mono text-[9px] text-ash">{room.index}</span>
                </div>
                <h3 className="mt-3 text-[12.5px] font-semibold leading-snug">{room.name}</h3>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-ash">{room.description}</p>
                <p className="mt-2.5 border-t border-white/[0.05] pt-2 text-[8.5px] leading-snug text-brand-300/80">
                  {room.connects}
                </p>
                {room.mvp && (
                  <span className="absolute right-3 top-3 rounded bg-mint-400/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-mint-300">
                    MVP
                  </span>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { Modal } from '../components/Modal'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { events } from '../data/content'

type Event = (typeof events)[number]

export function Events() {
  const [selected, setSelected] = useState<Event | null>(null)

  return (
    <section id="events" className="section-pad relative">
      <div className="shell">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="Events & community"
              title={
                <>
                  Stronger connections
                  <br />
                  <span className="gradient-text">beyond graduation.</span>
                </>
              }
              description="Bring alumni and students together through shared knowledge, professional discussions, career talks and university activities."
            />
          </Reveal>
          <Reveal delay={80}>
            <span className="demo-note whitespace-nowrap">
              <span className="h-1 w-1 rounded-full bg-azure-400" />
              Sample events · dates to be announced
            </span>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {events.map((event, index) => (
            <Reveal key={event.title} delay={index * 70}>
              <article className="card card-hover group flex h-full flex-col overflow-hidden">
                <div className={`relative h-28 bg-gradient-to-br ${event.accent} to-transparent`}>
                  <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-60" />
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-ink-950/60 text-brand-200 backdrop-blur transition group-hover:scale-105">
                      <event.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-ink-950/70 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-mist backdrop-blur">
                    {event.category}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[14.5px] font-semibold leading-snug">{event.title}</h3>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-mist">{event.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] text-ash">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {event.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.mode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(event)}
                    className="mt-3 inline-flex items-center gap-1.5 self-start rounded-lg py-1.5 text-[11.5px] font-medium text-brand-300 transition hover:text-brand-200"
                  >
                    View details
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle="Sample event · scheduling opens with accounts"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">{selected.category}</span>
              <span className="chip">{selected.mode}</span>
              <span className="chip">{selected.date}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-mist">{selected.description}</p>
            <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-3">
              <p className="text-[11px] leading-relaxed text-mist">
                Events are sample records. Real scheduling, registration and joining links arrive with the
                mentorship and community modules.
              </p>
            </div>
            <a href="/register" className="btn-primary w-full !py-2.5 !text-[12.5px]">
              Join the community
            </a>
          </div>
        )}
      </Modal>
    </section>
  )
}

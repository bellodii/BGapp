import clsx from 'clsx'

/** Marca BG: cuadrado amarillo industrial con las letras. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={clsx('flex shrink-0 items-center justify-center rounded-xl bg-brand-400 font-black tracking-tight text-ink-950 shadow-[0_0_0_2px_rgba(0,0,0,0.25)_inset]', className)}
      style={{ width: size, height: size, fontSize: size * 0.46 }}
      aria-label="BG"
    >
      BG
    </div>
  )
}

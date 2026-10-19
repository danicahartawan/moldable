type MoldableWordmarkProps = {
  className?: string
}

export function MoldableWordmark({ className = '' }: MoldableWordmarkProps) {
  return (
    <span className={`moldable-wordmark ${className}`.trim()} role="img" aria-label="Moldable">
      <span className="moldable-wordmark__name" aria-hidden="true">
        <span>mol</span><span className="moldable-wordmark__join"><span>d</span><span>a</span></span><span>ble</span>
      </span>
    </span>
  )
}

export function PikachuLogo({ size = 72 }: { size?: number }) {
  return (
    <img
      src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
      alt="Pikachu"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        transform: 'scaleX(-1)',
        filter: 'drop-shadow(0 0 6px rgba(255,200,0,0.7))',
      }}
    />
  )
}

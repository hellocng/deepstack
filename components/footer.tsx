export function Footer() {
  return (
    <footer className='container mx-auto px-4 py-8 mt-16'>
      <div className='text-center text-muted-foreground'>
        <p>
          Developed by{' '}
          <a
            href='https://hellocng.com'
            target='_blank'
            rel='noopener noreferrer'
            className='font-bold text-foreground hover:text-primary transition-colors'
          >
            hellocng
          </a>
        </p>
      </div>
    </footer>
  )
}

export function Footer(): JSX.Element {
  return (
    <footer className='w-full flex items-center justify-center border-t border-border mx-auto text-center text-xs gap-8 py-8 bg-background'>
      <p className='text-muted-foreground'>
        Developed by{' '}
        <a
          href='https://hellocng.com'
          target='_blank'
          className='font-bold hover:underline text-foreground'
          rel='noreferrer'
        >
          hellocng
        </a>
      </p>
    </footer>
  )
}

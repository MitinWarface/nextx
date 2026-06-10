export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Страница не найдена</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">
          На главную
        </a>
      </div>
    </div>
  );
}

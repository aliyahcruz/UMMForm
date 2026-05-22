import LoginForm from "./LoginForm";

export default function LoginPage({ searchParams }) {
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : "/";

  return (
    <main>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}

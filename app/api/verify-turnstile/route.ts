export async function POST(req: Request) {
  const { token } = await req.json();

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: "0x4AAAAAACwYkQNpKRbKDW54UFwXWv8mMRk",
        response: token,
      }),
    }
  );

  const data = await res.json();

  return Response.json(data);
}

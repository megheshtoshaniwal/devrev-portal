import { redirect } from "next/navigation";

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || "en-US";
const DEFAULT_SLUG = process.env.DEFAULT_PORTAL_SLUG || "my-portal";

export default function Home() {
  redirect(`/${DEFAULT_LOCALE}/${DEFAULT_SLUG}`);
}

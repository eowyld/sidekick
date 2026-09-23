import { redirect } from "next/navigation";

/** La liste des spectacles est devenue la page /live. */
export default function Page() {
    redirect("/live");
}

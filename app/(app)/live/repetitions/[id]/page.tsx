import { EventEditPage } from "@/modules/live/components/EventEditPage";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <EventEditPage id={id} rehearsal={true}/>;}

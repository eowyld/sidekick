import { ProductionEditPage } from "@/modules/live/components/ProductionEditPage";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProductionEditPage id={id}/>;}

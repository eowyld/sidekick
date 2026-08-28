import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card className="border-[rgba(240,255,0,0.18)] bg-[rgba(16,16,16,0.92)]">
        <CardHeader>
          <CardTitle className="text-2xl">Verification de session...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full overflow-hidden bg-[rgba(245,245,245,0.08)]">
            <div className="h-full w-1/2 animate-pulse bg-[#F0FF00]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

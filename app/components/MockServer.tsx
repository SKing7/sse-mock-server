import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {  Server, Square } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Label } from "@/components/ui/label";

export default function Mockserver({
  isMockServerRunning,
  presetDatas,
  onStartMockServer,
  onStopMockServer,
}) {

  const [conversationId, setConversationId] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState("1");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Mock 服务器
        </CardTitle>
        <CardDescription>使用捕获的数据启动SSE Mock服务器</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm flex gap-2">
          <Label className=" w-[100px] text-sm" htmlFor="preset-select">Mock数据源</Label>
          <Select onValueChange={setSelectedPreset} value={selectedPreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择Mock数据" />
            </SelectTrigger>
            <SelectContent>
              {presetDatas.files.map((preset, index) => (
                <SelectItem key={index} value={preset}>
                  {preset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Label className="text-sm w-[100px]" htmlFor="conversation-id">ConversationId</Label>
          <Input id="conversation-id" placeholder="coversationId" value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Label className="text-sm w-[100px]" htmlFor="conversation-id">倍速</Label>
          <Select onValueChange={setSelectedSpeed} value={selectedSpeed}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              {[0.5, 1, 2, 3, 4, 5, 'fast', 'very fast'].map((preset, index) => (
                <SelectItem key={index} value={String(preset)}>
                  {Number(preset) > 0 ? preset + 'x' : preset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {!isMockServerRunning ? (
            <Button onClick={() => onStartMockServer({ conversationId, presetData: selectedPreset, speed: selectedSpeed })} className="flex-1">
              <Server className="w-4 h-4 mr-2" />
              启动Mock服务器
            </Button>
          ) : (
            <Button
              onClick={onStopMockServer}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              停止Mock服务器
            </Button>
          )}
        </div>
        {isMockServerRunning && (
          <Badge variant="secondary" className="w-full justify-center">
            Mock服务器运行中 - http://localhost:4005
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

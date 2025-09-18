"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";

interface TTLSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTTL: number; // milliseconds
  onTTLChange: (ttlMinutes: number) => Promise<void>;
}

const TTL_OPTIONS = [
  { value: 3, label: "3분" },
  { value: 5, label: "5분" },
  { value: 10, label: "10분" },
  { value: 15, label: "15분" },
];

export default function TTLSettingsDialog({
  open,
  onOpenChange,
  currentTTL,
  onTTLChange,
}: TTLSettingsDialogProps) {
  // 현재 TTL을 분 단위로 변환
  const currentTTLMinutes = Math.round(currentTTL / (60 * 1000));

  const [selectedTTL, setSelectedTTL] = useState<string>(
    currentTTLMinutes.toString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const selectedMinutes = parseInt(selectedTTL);
    if (isNaN(selectedMinutes)) return;

    setIsSubmitting(true);
    try {
      await onTTLChange(selectedMinutes);
      onOpenChange(false);
    } catch (error) {
      console.error("TTL 변경 실패:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // 원래 값으로 되돌리기
    setSelectedTTL(currentTTLMinutes.toString());
    onOpenChange(false);
  };

  // 다이얼로그가 열릴 때마다 현재 TTL로 초기화
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedTTL(currentTTLMinutes.toString());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            자동 만료 시간 설정
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="ttl-select"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                주문번호 자동 제거 시간
              </label>
              <Select value={selectedTTL} onValueChange={setSelectedTTL}>
                <SelectTrigger id="ttl-select" className="w-full">
                  <SelectValue placeholder="시간을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {TTL_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                • 현재 설정:{" "}
                <span className="font-medium">{currentTTLMinutes}분</span>
              </p>
              <p>• 변경 후 입력된 주문번호부터 새로운 시간이 적용됩니다.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              isSubmitting || selectedTTL === currentTTLMinutes.toString()
            }
            className="bg-[#5A8BFF] hover:bg-[#4A7BEF] text-white"
          >
            {isSubmitting ? "적용 중..." : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

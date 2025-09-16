"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";

interface RecommendedNumbersProps {
  numbers: number[];
  onSelectNumber: (number: number) => void;
  lastOrderNumber?: number;
}

export default function RecommendedNumbers({
  numbers,
  onSelectNumber,
  lastOrderNumber,
}: RecommendedNumbersProps) {
  const [animatingButton, setAnimatingButton] = useState<number | null>(null);

  const handleButtonClick = (number: number) => {
    // 애니메이션 시작
    setAnimatingButton(number);

    // onSelectNumber 콜백 호출
    onSelectNumber(number);

    // 100ms 후 애니메이션 종료
    setTimeout(() => {
      setAnimatingButton(null);
    }, 100);
  };

  // 추천 번호가 없으면 아무것도 렌더링하지 않음
  if (numbers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">추천 번호</h3>
      <div className="flex gap-8 justify-center">
        {numbers.map((number, index) => {
          const isNextFromLast =
            lastOrderNumber && number === lastOrderNumber + 1;
          return (
            <Button
              key={`${number}-${index}`}
              type="button"
              onClick={() => handleButtonClick(number)}
              className={`
                ${isNextFromLast ? "w-20 h-20 text-3xl" : "w-16 h-16 text-2xl"}
                font-bold 
                rounded-lg
                transition-all duration-100
                ${
                  animatingButton === number
                    ? "scale-95 bg-[#2D5FFF] text-white"
                    : "bg-[#E6ECFF] text-[#2D5FFF] hover:bg-[#2D5FFF] hover:text-white"
                }
                border-0 shadow-sm
              `}
              disabled={false}
            >
              {number}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

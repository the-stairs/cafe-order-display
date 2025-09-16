"use client";

import { motion } from "framer-motion";

interface OrderCardProps {
  number: number;
  isNew?: boolean;
  isLatest?: boolean; // 첫 번째(최신) 카드 여부
  className?: string; // 추가 CSS 클래스
}

export default function OrderCard({
  number,
  isNew = false,
  isLatest = false,
  className = "",
}: OrderCardProps) {
  // 숫자 길이에 따른 반응형 폰트 크기 계산
  const getNumberSize = (num: number) => {
    const digits = num.toString().length;
    if (isLatest) {
      // 최신 카드의 반응형 폰트 크기
      if (digits <= 2) return "text-[200px] lg:text-[260px] xl:text-[300px]";
      if (digits === 3) return "text-[160px] lg:text-[200px] xl:text-[240px]";
      return "text-[140px] lg:text-[180px] xl:text-[200px]";
    } else {
      // 일반 카드의 반응형 폰트 크기
      if (digits <= 2) return "text-[120px] lg:text-[150px] xl:text-[180px]";
      if (digits === 3) return "text-[100px] lg:text-[125px] xl:text-[150px]";
      return "text-[80px] lg:text-[100px] xl:text-[120px]";
    }
  };

  // 애니메이션 변형 정의
  const cardVariants = {
    initial: {
      scale: 1,
      backgroundColor: isLatest ? (isNew ? "#FF7300" : "#1E2A44") : "#E9EEF7",
    },
    animate: {
      scale: isNew ? 1.06 : 1.0,
      backgroundColor: isLatest ? (isNew ? "#FF7300" : "#1E2A44") : "#E9EEF7",
    },
    highlight: {
      backgroundColor: isLatest ? "#FF7300" : "#E9EEF7",
    },
  };

  return (
    <motion.div
      className={`
        relative flex flex-col items-center justify-center
        h-[300px] lg:h-[320px] xl:h-[360px]
        rounded-2xl
        ${isLatest ? "bg-[#1E2A44] text-white" : "bg-[#E9EEF7] text-[#1E2A44]"}
        shadow-[0_8px_24px_rgba(0,0,0,0.08)]
        transition-all duration-300
        ${className}
      `}
      variants={cardVariants}
      initial="initial"
      animate={isNew ? "highlight" : "animate"}
      whileHover={{ scale: 1.02 }}
      transition={{
        duration: 0.4,
        ease: "easeInOut",
      }}
    >
      {/* 최신 완료 라벨 (첫 번째 카드만) */}
      {isLatest && (
        <motion.div
          className="absolute top-6 left-6 text-sm font-medium text-[#8A8F9A]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          최근 완료
        </motion.div>
      )}

      {/* 완료 체크 아이콘 (모든 카드) */}
      <motion.div
        className="absolute top-6 right-6 text-3xl opacity-60"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        ✅
      </motion.div>

      {/* 주문 번호 */}
      <motion.div
        className={`
          font-bold text-center leading-none
          ${getNumberSize(number)}
        `}
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{
          scale: isNew ? 1.02 : 1,
          opacity: 1,
        }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
      >
        {number}
      </motion.div>
    </motion.div>
  );
}

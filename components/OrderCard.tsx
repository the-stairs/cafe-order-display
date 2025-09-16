"use client";

import { motion } from "framer-motion";

interface OrderCardProps {
  number: number;
  isNew?: boolean;
}

export default function OrderCard({ number, isNew = false }: OrderCardProps) {
  return (
    <motion.div
      className={`
        flex items-center justify-center
        min-h-[200px] min-w-[240px]
        rounded-lg border-2
        ${
          isNew
            ? "bg-[#2D5FFF] text-white border-[#2D5FFF] shadow-xl"
            : "bg-[#F5F5F5] text-[#1E2A44] border-gray-300"
        }
      `}
      initial={{ scale: 1 }}
      animate={{
        scale: isNew ? 1.05 : 1,
        boxShadow: isNew
          ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)"
          : "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
    >
      <motion.span
        className="font-bold text-center"
        style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
        initial={{ scale: 1 }}
        animate={{
          scale: isNew ? 1.02 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
      >
        {number}
      </motion.span>
    </motion.div>
  );
}

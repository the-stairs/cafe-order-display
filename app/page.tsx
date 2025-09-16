"use client";

import Image from "next/image";
import { useState } from "react";

// 기본 Room ID (환경 변수로 설정 가능)
const DEFAULT_ROOM_ID = process.env.NEXT_PUBLIC_DEFAULT_ROOM_ID || "Cafe_Seeik";

export default function Home() {
  const [roomId, setRoomId] = useState(DEFAULT_ROOM_ID);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        {/* 카페 주문 디스플레이 프로젝트 소개 */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold mb-4">
            카페 주문번호 디스플레이 시스템
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Firebase Realtime Database를 사용한 실시간 주문번호 디스플레이
          </p>
        </div>

        <div className="text-center sm:text-left max-w-md">
          <h2 className="text-lg font-semibold mb-4">사용 방법</h2>
          <ol className="font-mono list-inside list-decimal text-sm/6 space-y-2">
            <li className="tracking-[-.01em]">
              아래에서 Room ID를 설정하세요.
            </li>
            <li className="tracking-[-.01em]">
              Controller 페이지에서 주문번호를 관리하세요.
            </li>
            <li className="tracking-[-.01em]">
              Display 페이지에서 주문번호를 확인하고 🔊 버튼으로 사운드를
              켜세요.
            </li>
          </ol>
        </div>

        {/* Room ID 설정 */}
        <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4">Room ID 설정</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="roomId"
                className="block text-sm font-medium mb-2"
              >
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="예: Cafe_Seeik"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display와 Controller가 같은 Room ID를 사용해야 연결됩니다
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href={`/controller?room=${roomId}`}
            rel="noopener noreferrer"
          >
            📱 Controller 페이지
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href={`/display?room=${roomId}`}
            rel="noopener noreferrer"
          >
            📺 Display 페이지
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}

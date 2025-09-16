"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ref,
  onValue,
  onChildAdded,
  query,
  limitToLast,
  remove,
} from "firebase/database";
import { db } from "../../utils/firebaseClient";
import OrderCard from "../../components/OrderCard";
import { useSound } from "../../hooks/useSound";

type OrderStatus = "ready" | "done" | "removed";

interface Order {
  id: string;
  number: number;
  createdAt: number;
  expiresAt?: number;
  status: OrderStatus;
}

// 타입 가드 함수: 안전한 status 검증
function isValidOrderStatus(status: unknown): status is OrderStatus {
  return (
    typeof status === "string" && ["ready", "done", "removed"].includes(status)
  );
}

// 로딩 컴포넌트
function LoadingComponent() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔄</div>
        <p className="text-xl text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}

// 실제 디스플레이 컴포넌트
function DisplayContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<{ [orderId: string]: number }>(
    {}
  );
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialAddedDoneRef = useRef<boolean>(false);

  // useRef로 최신 상태 관리 (Firebase 리스너 재구독 방지)
  const isSoundEnabledRef = useRef(isSoundEnabled);
  const playSoundRef = useRef<(() => void) | null>(null);
  const kickHighlightRef = useRef<((orderId: string) => void) | null>(null);

  // 사운드 훅 초기화 (환경 변수에서 사운드 URL 가져오기)
  const { play: playSound, resume: resumeAudio } = useSound(
    process.env.NEXT_PUBLIC_SOUND_URL || "/Ding-Dong-hd.mp3"
  );

  // playSound 함수의 최신 참조 유지
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  // URL에서 Room ID 가져오기
  const roomId = searchParams.get("room");

  // Room ID가 없으면 메인 페이지로 리다이렉트
  useEffect(() => {
    if (!roomId) {
      console.log("Room ID가 없습니다. 메인 페이지로 리다이렉트합니다.");
      router.push("/");
      return;
    }
  }, [roomId, router]);

  // isSoundEnabled 상태의 최신 참조 유지
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // localStorage에서 사운드 설정 불러오기 (첫 방문 시 기본값: true)
  useEffect(() => {
    const savedSoundSetting = localStorage.getItem("cafeDisplaySoundEnabled");

    if (savedSoundSetting !== null) {
      // 이미 설정이 있으면 사용자가 저장한 값 사용
      const userSetting = JSON.parse(savedSoundSetting);
      setIsSoundEnabled(userSetting);
      console.log("저장된 사운드 설정 불러옴:", userSetting ? "켜짐" : "꺼짐");
    } else {
      // 처음 방문이면 기본값 true로 설정하고 저장
      setIsSoundEnabled(true);
      localStorage.setItem("cafeDisplaySoundEnabled", JSON.stringify(true));
      console.log("첫 방문 - 사운드 기본값 설정: 켜짐");
    }
  }, []);

  // 사운드 토글 함수 (iOS/Safari 호환성 포함)
  const toggleSound = useCallback(async () => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    localStorage.setItem(
      "cafeDisplaySoundEnabled",
      JSON.stringify(newSoundState)
    );
    console.log("사운드 설정 변경:", newSoundState ? "켜짐" : "꺼짐");

    // iOS/Safari에서 사운드를 켤 때 AudioContext 활성화
    if (newSoundState) {
      await resumeAudio();
    }
  }, [isSoundEnabled, resumeAudio]);

  // 하이라이트 함수 (여러 주문 동시 지원, ref 기반)
  const kickHighlight = useCallback((orderId: string) => {
    console.log("새로운 주문 하이라이트 설정:", orderId);

    // 여러 주문 동시 하이라이트를 위한 상태 업데이트
    const expiryTime = Date.now() + 5000; // 5초 후 만료
    setNewOrderIds((prev) => ({
      ...prev,
      [orderId]: expiryTime,
    }));

    // 사운드 재생 (ref로 최신 상태 참조)
    if (isSoundEnabledRef.current && playSoundRef.current) {
      try {
        playSoundRef.current();
        console.log("딩동 알림음 재생");
      } catch (error) {
        console.warn("사운드 재생 실패:", error);
      }
    }
  }, []);

  // kickHighlight 함수의 안정적인 참조 유지
  useEffect(() => {
    kickHighlightRef.current = kickHighlight;
  }, [kickHighlight]);

  // 하이라이트 만료 관리 (1초마다 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNewOrderIds((prev) => {
        const updated = { ...prev };
        let hasExpired = false;

        Object.keys(updated).forEach((orderId) => {
          if (updated[orderId] <= now) {
            delete updated[orderId];
            hasExpired = true;
          }
        });

        if (hasExpired) {
          console.log(
            "만료된 하이라이트 제거:",
            Object.keys(prev).filter((id) => !updated[id])
          );
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Firebase 연결 상태 감지
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setIsConnected(connected);
      console.log("Firebase 연결 상태:", connected ? "연결됨" : "연결 끊김");
    });

    return () => unsubscribeConnection();
  }, []);

  // 서버 시간 오프셋 구독
  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsubscribeOffset = onValue(offsetRef, (snapshot) => {
      const offset = snapshot.val() || 0;
      setServerTimeOffset(offset);
      console.log("서버 시간 오프셋:", offset);
    });

    return () => unsubscribeOffset();
  }, []);

  // 현재 서버 시간 계산 함수
  const getServerTime = useCallback(() => {
    return Date.now() + serverTimeOffset;
  }, [serverTimeOffset]);

  // TTL 자동 제거 기능
  useEffect(() => {
    if (!roomId) return;

    const cleanupExpiredOrders = () => {
      const currentServerTime = getServerTime();
      console.log(
        "만료된 주문 정리 시작, 현재 서버 시간:",
        new Date(currentServerTime)
      );

      setOrders((prevOrders) => {
        const expiredOrderIds: string[] = [];
        const validOrders = prevOrders.filter((order) => {
          const isExpired =
            order.expiresAt && order.expiresAt <= currentServerTime;
          if (isExpired) {
            expiredOrderIds.push(order.id);
          }
          return !isExpired;
        });

        // Firebase에서도 만료된 주문 제거
        expiredOrderIds.forEach((orderId) => {
          const orderRef = ref(db, `rooms/${roomId}/orders/${orderId}`);
          remove(orderRef).catch((error) => {
            console.error("주문 제거 실패:", orderId, error);
          });
        });

        if (expiredOrderIds.length > 0) {
          console.log("만료된 주문 제거:", expiredOrderIds);
        }

        return validOrders;
      });
    };

    // 10초마다 만료된 주문 정리
    const cleanupInterval = setInterval(cleanupExpiredOrders, 10000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [roomId, getServerTime]);

  // 전체 주문 목록 동기화 (onValue)
  useEffect(() => {
    if (!roomId) return;

    console.log("주문 목록 동기화 시작, Room ID:", roomId);
    const ordersRef = ref(db, `rooms/${roomId}/orders`);

    const unsubscribeOrders = onValue(
      ordersRef,
      (snapshot) => {
        console.log("전체 주문 목록 동기화:", snapshot.val());

        if (snapshot.exists()) {
          const data = snapshot.val();
          const orderList: Order[] = [];

          // Firebase 데이터를 배열로 변환 (방어 코드 포함)
          Object.keys(data).forEach((key) => {
            const order = data[key];
            orderList.push({
              id: key,
              number: order.number || 0,
              createdAt: Number(order.createdAt) || 0,
              expiresAt: order.expiresAt ? Number(order.expiresAt) : undefined,
              status: isValidOrderStatus(order.status) ? order.status : "ready",
            });
          });

          // 생성시간 기준 최신순 정렬 (동일 시간일 경우 번호 기준 2차 정렬)
          orderList.sort((a, b) => {
            const timeDiff = b.createdAt - a.createdAt;
            if (timeDiff === 0) {
              return b.number - a.number; // 번호 기준 2차 정렬
            }
            return timeDiff;
          });

          setOrders(orderList);

          // 첫 번째 데이터 스냅샷을 성공적으로 받으면 플래그 설정
          if (!initialAddedDoneRef.current) {
            initialAddedDoneRef.current = true;
            console.log("초기 데이터 로드 완료, 신규 주문 하이라이트 활성화");
          }
        } else {
          console.log("주문 데이터가 없습니다");
          setOrders([]);

          // 빈 데이터더라도 초기 로드 완료로 간주
          if (!initialAddedDoneRef.current) {
            initialAddedDoneRef.current = true;
            console.log(
              "초기 데이터 로드 완료 (빈 데이터), 신규 주문 하이라이트 활성화"
            );
          }
        }
      },
      (error) => {
        console.error("주문 목록 구독 오류:", error);
      }
    );

    return () => unsubscribeOrders();
  }, [roomId]);

  // 신규 주문 감지 (onChildAdded with limitToLast)
  useEffect(() => {
    if (!roomId) return;

    console.log("신규 주문 감지 시작, Room ID:", roomId);
    const newOrdersQuery = query(
      ref(db, `rooms/${roomId}/orders`),
      limitToLast(50)
    );

    const unsubscribeNewOrders = onChildAdded(
      newOrdersQuery,
      (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();

        if (orderId && orderData) {
          console.log("신규 주문 감지:", { id: orderId, data: orderData });

          // 가드: 초기 데이터 로드가 완료되지 않았으면 하이라이트하지 않음
          if (!initialAddedDoneRef.current) {
            console.log("초기 로드 중이므로 하이라이트 건너뛰기:", orderId);
            return;
          }

          // 하이라이트 효과 트리거 (진짜 신규 주문만, ref 기반)
          if (kickHighlightRef.current) {
            kickHighlightRef.current(orderId);
          }
        }
      },
      (error) => {
        console.error("신규 주문 감지 오류:", error);
      }
    );

    return () => unsubscribeNewOrders();
  }, [roomId]); // ✅ kickHighlight 의존성 제거로 재구독 방지

  // Room ID가 없으면 로딩 상태 표시
  if (!roomId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔄</div>
          <p className="text-xl text-gray-500">Room ID를 확인하는 중...</p>
          <p className="text-sm text-gray-400 mt-2">
            잠시 후 메인 페이지로 이동됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      {/* 상단 헤더 */}
      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 px-6 lg:px-10 py-4 lg:h-20">
        <div className="flex items-center gap-4 lg:gap-6">
          {/* 로고 */}
          <div className="flex-shrink-0">
            <svg
              width="76"
              height="48"
              viewBox="0 0 227 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 lg:h-12 w-auto" // 모바일: 32px, 데스크톱: 48px
            >
              <g clipPath="url(#clip0_597_2379)">
                <path
                  d="M49.2465 13.8692C50.3099 13.25 50.6408 11.8481 49.9172 10.8486C48.8097 9.30949 46.6961 8.13308 43.8986 7.93848C38.3697 7.55814 35.1133 11.2599 34.5309 14.7581C33.6837 19.853 38.2418 24.6294 41.3084 28.7645C46.4711 35.6594 50.4732 43.3193 49.0921 51.6073C47.0667 63.7783 34.4382 72.9154 19.9785 71.9247C6.55576 71.0092 -1.5985 61.0186 0.263568 49.8382C1.89619 40.0245 10.4167 35.3454 18.2356 35.8805C22.3877 36.1635 26.381 38.1493 29.0991 42.1296C29.6816 42.9876 29.5404 44.1463 28.777 44.8451L24.1351 49.0997C23.2746 49.8869 21.9112 49.8382 21.1655 48.9404C20.0888 47.6446 18.796 47.0741 17.4281 46.9768C14.5821 46.7822 11.533 48.8033 10.9374 52.3812C10.1122 57.3257 14.3173 62.3056 21.4302 62.792C30.0434 63.3802 35.7134 57.1532 36.6886 51.2977C37.5005 46.4284 35.2545 41.6608 31.0891 36.451C25.953 29.8658 21.1522 24.1517 22.5333 15.8638C24.0204 6.8859 32.0908 -0.796162 44.6531 0.0662461C57.8464 0.968457 62.356 10.3576 61.2043 17.279C60.3924 22.1483 56.6992 26.5886 51.4042 26.226C47.5345 25.9606 44.9443 22.7852 45.5665 19.0569C45.9327 16.8633 47.3182 14.9881 49.2465 13.8692Z"
                  fill="#FF7300"
                />
                <path
                  d="M100.374 45.1779C95.0926 56.7607 86.3691 65.5793 73.2067 65.5793C61.8798 65.5793 54.6875 59.1356 54.6875 48.5523C54.6875 36.9695 63.411 24.8516 76.5734 24.8516C85.0674 24.8516 90.3492 29.9154 90.3492 35.8196C90.3492 42.4933 83.8452 51.0068 66.8571 50.5469C67.8543 55.1508 71.3711 57.8353 76.7278 57.8353C84.0746 57.8353 91.342 52.5415 96.0104 43.0329C97.4621 43.1081 99.6065 44.2579 100.374 45.1823V45.1779ZM66.7027 45.4078C76.1145 45.253 80.249 41.1135 80.249 37.739C80.249 35.9744 79.1768 34.3646 76.4234 34.3646C71.6005 34.3646 67.5455 39.3489 66.7071 45.4078H66.7027Z"
                  fill="#FF7300"
                />
                <path
                  d="M141.238 45.1779C135.956 56.7607 127.232 65.5793 114.07 65.5793C102.743 65.5793 95.5508 59.1356 95.5508 48.5523C95.5508 36.9695 104.274 24.8516 117.437 24.8516C125.931 24.8516 131.212 29.9154 131.212 35.8196C131.212 42.4933 124.708 51.0068 107.72 50.5469C108.718 55.1508 112.234 57.8353 117.591 57.8353C124.938 57.8353 132.205 52.5415 136.874 43.0329C138.325 43.1081 140.47 44.2579 141.238 45.1823V45.1779ZM107.566 45.4078C116.978 45.253 121.112 41.1135 121.112 37.739C121.112 35.9744 120.04 34.3646 117.287 34.3646C112.464 34.3646 108.409 39.3489 107.57 45.4078H107.566Z"
                  fill="#FF7300"
                />
                <path
                  d="M153.25 25.5436L145.29 51.6237C144.293 54.923 144.756 57.5279 147.739 57.5279C152.024 57.5279 156.158 51.7741 160.443 43.0306C161.899 43.1058 164.039 44.2556 164.802 45.18C159.37 57.0679 152.637 65.3515 143.375 65.3515C134.113 65.3515 132.203 57.9126 134.881 49.0144L142.073 25.5436H153.246H153.25ZM150.956 7.90625C154.706 7.90625 157.535 10.8959 157.535 14.58C157.535 18.264 154.702 21.0989 150.956 21.0989C147.21 21.0989 144.452 18.2596 144.452 14.58C144.452 10.9004 147.285 7.90625 150.956 7.90625Z"
                  fill="#FF7300"
                />
                <path
                  d="M224.54 45.8564C224.292 45.6088 224.032 45.3832 223.772 45.1709C222.4 43.9724 220.599 43.2427 218.574 43.2427C214.153 43.2427 210.746 46.8383 210.746 51.2653C210.746 54.538 212.608 57.2491 215.366 58.4432C215.19 58.6776 215 58.912 214.775 59.1464C208.99 65.2451 185.811 64.5685 177.878 49.7351L177.344 48.6648C207.371 39.479 198.382 26.167 198.382 26.167C195.113 21.5719 191.066 22.3238 189.05 23.1154C188.997 23.1331 188.948 23.1596 188.896 23.1773C188.829 23.2039 188.763 23.2348 188.701 23.2614C188.556 23.3233 188.41 23.394 188.269 23.4648C188.097 23.5532 187.969 23.624 187.89 23.6727C187.89 23.6727 187.881 23.6771 187.876 23.6815C187.819 23.7169 187.784 23.739 187.784 23.739C186.032 24.8535 184.863 26.7552 184.761 28.9532C184.62 32.1154 186.742 34.7247 189.805 35.397C189.624 35.6889 189.412 35.9985 189.16 36.3301C189.16 36.3301 184.333 42.7252 171.365 45.4142C171.254 45.4363 171.021 45.4805 170.712 45.5336L172.614 39.28L175.137 30.9965L182.149 9.11787C182.524 7.91934 181.633 6.70312 180.384 6.70312H173.108C172.296 6.70312 171.577 7.23384 171.338 8.01222L153.715 64.6702H164.887L168.956 51.3139C173.196 57.4835 177.105 61.0348 177.105 61.0348C187.66 72.0515 209.016 76.4343 221.292 64.5773C228.039 58.0628 228.392 49.7439 224.544 45.8609L224.54 45.8564Z"
                  fill="#FF7300"
                />
              </g>
              <defs>
                <clipPath id="clip0_597_2379">
                  <rect width="227" height="72" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* 타이틀 텍스트 */}
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold text-[#0B0B0C]">
              준비 완료
            </h1>
            <p className="text-sm lg:text-lg text-gray-600 mt-1">PICK UP</p>
          </div>
        </div>

        {/* 연결 상태 및 Room 정보 표시 */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-4 lg:mt-0">
          {/* 사운드 토글 버튼 */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
              isSoundEnabled
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            title={isSoundEnabled ? "소리 끄기" : "소리 켜기"}
          >
            <span className="text-lg">{isSoundEnabled ? "🔊" : "🔇"}</span>
            <span className="font-medium text-sm">
              <span className="hidden lg:inline">
                {isSoundEnabled ? "소리 켜짐" : "소리 꺼짐 — 터치하여 켜기"}
              </span>
              <span className="lg:hidden">
                {isSoundEnabled ? "소리 ON" : "소리 OFF"}
              </span>
            </span>
          </button>

          {/* 연결 상태 */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="font-medium">
              {isConnected ? "연결됨" : "연결 끊김"}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            <span className="hidden lg:inline">Room: </span>
            <span className="font-mono font-medium">{roomId}</span>
          </div>

          {/* 서버 시간 오프셋 표시 (개발용) */}
          {serverTimeOffset !== 0 && (
            <div className="text-xs text-gray-400">
              Offset: {serverTimeOffset}ms
            </div>
          )}
        </div>
      </header>

      {/* 주문 카드 그리드 */}
      <main className="flex-1 px-10" role="main" aria-label="주문 디스플레이">
        {/* 섹션 라벨 */}
        <div className="mb-6 px-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              최근 완료
            </h2>
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs text-gray-400">
              총 {orders.length}개 주문
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl text-gray-500">준비된 주문이 없습니다</p>
              <p className="text-sm text-gray-400 mt-2">
                새로운 주문이 준비되면 여기에 표시됩니다
              </p>
              {!isConnected && (
                <p className="text-xs text-red-500 mt-4">
                  ⚠️ 서버에 연결되지 않았습니다
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[1840px] mx-auto">
            {/* 반응형 격자 레이아웃 */}
            <div
              className="grid gap-6 auto-rows-max
              grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
            "
            >
              {orders.map((order, index) => {
                const isLatest = index === 0; // 첫 번째가 최신
                return (
                  <OrderCard
                    key={order.id}
                    number={order.number}
                    isNew={Boolean(newOrderIds[order.id])}
                    isLatest={isLatest}
                    className={`
                      ${
                        isLatest
                          ? "col-span-2 w-full max-w-[656px] lg:max-w-[740px] xl:max-w-[824px]"
                          : "w-full max-w-[320px] lg:max-w-[360px] xl:max-w-[400px]"
                      }
                      transition-all duration-300 ease-in-out
                    `}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 하단 정보 */}
      <footer className="mt-12 text-center text-blue-400 text-sm">
        <div className="flex justify-center items-center gap-6">
          <span>실시간 주문번호 디스플레이</span>
          <span>연결된 주문: {orders.length}개</span>
          <span>Room: {roomId}</span>
        </div>
      </footer>
    </div>
  );
}

// Suspense로 감싼 메인 컴포넌트
export default function DisplayPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <DisplayContent />
    </Suspense>
  );
}

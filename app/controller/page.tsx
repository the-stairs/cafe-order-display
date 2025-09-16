"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  limitToLast,
  onValue,
  push,
  query,
  ref,
  remove,
} from "firebase/database";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { db } from "../../utils/firebaseClient";

// Zod 스키마로 입력 유효성 검사 (숫자만 허용)
const orderNumberSchema = z.object({
  orderNumber: z
    .string()
    .min(1, "주문번호를 입력해주세요")
    .max(6, "주문번호는 6자리까지 입력 가능합니다")
    .regex(/^[0-9]+$/, "숫자만 입력 가능합니다"),
});

type OrderNumberForm = z.infer<typeof orderNumberSchema>;

interface Order {
  id: string;
  number: number;
  createdAt: number;
  expiresAt?: number;
  status: string;
}

// 최근 삭제된 주문을 저장하는 타입
interface DeletedOrder {
  number: number;
  createdAt: number;
  expiresAt?: number;
  status: string;
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

// 실제 컨트롤러 컴포넌트
function ControllerContent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lastDeletedOrder, setLastDeletedOrder] = useState<DeletedOrder | null>(
    null
  );
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();

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

  // React Hook Form 설정
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
    setValue,
  } = useForm<OrderNumberForm>({
    resolver: zodResolver(orderNumberSchema),
    mode: "onChange",
    defaultValues: {
      orderNumber: "",
    },
  });

  // 현재 입력 값을 실시간으로 추적
  const currentOrderNumber = useWatch({
    control,
    name: "orderNumber",
    defaultValue: "",
  });

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

  // 최근 주문 목록 구독 (Controller에서 확인용)
  useEffect(() => {
    if (!roomId) return;

    console.log("최근 주문 목록 구독 시작, Room ID:", roomId);
    const recentOrdersQuery = query(
      ref(db, `rooms/${roomId}/orders`),
      limitToLast(10) // 최근 10개만 표시
    );

    const unsubscribeRecentOrders = onValue(
      recentOrdersQuery,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const orderList: Order[] = [];

          Object.keys(data).forEach((key) => {
            const order = data[key];
            orderList.push({
              id: key,
              number: order.number || 0,
              createdAt: Number(order.createdAt) || 0,
              expiresAt: order.expiresAt ? Number(order.expiresAt) : undefined,
              status: order.status || "ready",
            });
          });

          // 최신순으로 정렬
          orderList.sort((a, b) => b.createdAt - a.createdAt);
          setRecentOrders(orderList);
        } else {
          setRecentOrders([]);
        }
      },
      (error) => {
        console.error("최근 주문 목록 구독 오류:", error);
      }
    );

    return () => unsubscribeRecentOrders();
  }, [roomId]);

  // 주문 번호 추가 함수
  const onSubmit = async (data: OrderNumberForm) => {
    if (!roomId || isSubmitting) return;

    // 중복 주문번호 방지 검사
    const orderNumber = Number(data.orderNumber);
    const isDuplicate = recentOrders.some(
      (order) => order.number === orderNumber
    );

    if (isDuplicate) {
      toast.error("이미 존재하는 주문번호입니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const currentTime = getServerTime();
      const fiveMinutesFromNow = currentTime + 5 * 60 * 1000; // 5분 후

      const newOrder = {
        number: orderNumber,
        status: "ready",
        createdAt: currentTime,
        expiresAt: fiveMinutesFromNow,
      };

      console.log("새 주문 추가:", newOrder);

      // Firebase에 주문 추가
      const ordersRef = ref(db, `rooms/${roomId}/orders`);
      await push(ordersRef, newOrder);

      console.log("주문이 성공적으로 추가되었습니다:", orderNumber);

      // 성공 알림
      toast.success(`주문번호 ${orderNumber}이(가) 추가되었습니다.`);

      // 입력 필드 초기화
      reset();

      // Undo를 위해 마지막 삭제된 주문 정보 초기화
      setLastDeletedOrder(null);
    } catch (error) {
      console.error("주문 추가 실패:", error);
      toast.error("주문 추가에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo 기능 (최근 삭제된 주문 복구)
  const handleUndo = async () => {
    if (!roomId || !lastDeletedOrder) return;

    try {
      console.log("Undo 실행:", lastDeletedOrder);

      const ordersRef = ref(db, `rooms/${roomId}/orders`);
      await push(ordersRef, lastDeletedOrder);

      console.log("주문이 복구되었습니다:", lastDeletedOrder.number);
      toast.success(
        `주문번호 ${lastDeletedOrder.number}이(가) 복구되었습니다.`
      );
      setLastDeletedOrder(null);
    } catch (error) {
      console.error("Undo 실패:", error);
      toast.error("복구에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 특정 주문 삭제 함수
  const handleDeleteOrder = async (orderId: string) => {
    if (!roomId) return;

    try {
      // 삭제하기 전에 Undo를 위해 주문 정보 저장
      const orderToDelete = recentOrders.find((order) => order.id === orderId);
      if (orderToDelete) {
        setLastDeletedOrder({
          number: orderToDelete.number,
          createdAt: orderToDelete.createdAt,
          expiresAt: orderToDelete.expiresAt,
          status: orderToDelete.status,
        });
      }

      console.log("주문 삭제:", orderId);
      const orderRef = ref(db, `rooms/${roomId}/orders/${orderId}`);
      await remove(orderRef);

      console.log("주문이 삭제되었습니다:", orderId);
      toast.success("주문이 삭제되었습니다.");
    } catch (error) {
      console.error("주문 삭제 실패:", error);
      toast.error("주문 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 숫자 키패드 버튼 클릭 핸들러
  const handleKeypadClick = (digit: string) => {
    // 현재 입력 값에 새로운 숫자를 추가
    const newValue = currentOrderNumber + digit;

    // 6자리 제한 확인
    if (newValue.length <= 6) {
      setValue("orderNumber", newValue, { shouldValidate: true });
    }
  };

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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 상단 헤더 */}
      <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#1E2A44]">주문 관리</h1>
            <p className="text-gray-600">Controller</p>
          </div>

          {/* 연결 상태 및 Room 정보 */}
          <div className="flex items-center gap-4">
            {/* Room ID 표시 */}
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
              <span className="font-medium">Room: {roomId}</span>
            </div>

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
                {isConnected ? "온라인" : "오프라인"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 입력 영역 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            주문번호 입력
          </h2>

          {/* 주문번호 입력 폼 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="orderNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                주문번호
              </label>
              <Input
                id="orderNumber"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="예: 1002"
                className="text-2xl py-4 text-center"
                {...register("orderNumber")}
                disabled={!isConnected || isSubmitting}
              />
              {errors.orderNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.orderNumber.message}
                </p>
              )}
            </div>

            {/* 추가 버튼 */}
            <Button
              type="submit"
              disabled={!isConnected || isSubmitting || !isValid}
              className="w-full bg-[#2D5FFF] hover:bg-[#1E47CC] text-white py-3 text-lg"
            >
              {isSubmitting ? "추가 중..." : "추가"}
            </Button>
          </form>

          {/* 간단한 숫자 키패드 */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              숫자 키패드
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  onClick={() => handleKeypadClick(digit.toString())}
                  className="h-12 text-lg"
                  disabled={!isConnected}
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setValue("orderNumber", "", { shouldValidate: true })
                }
                className="h-12 text-lg"
                disabled={!isConnected}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleKeypadClick("0")}
                className="h-12 text-lg"
                disabled={!isConnected}
              >
                0
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // 백스페이스 기능 구현 - 마지막 글자 제거
                  const newValue = currentOrderNumber.slice(0, -1);
                  setValue("orderNumber", newValue, { shouldValidate: true });
                }}
                className="h-12 text-lg"
                disabled={!isConnected}
              >
                ⌫
              </Button>
            </div>
          </div>
        </div>

        {/* 오른쪽: 최근 주문 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              최근 주문 목록
            </h2>

            <Button
              type="button"
              variant="outline"
              onClick={handleUndo}
              disabled={!lastDeletedOrder || !isConnected}
              className="px-4 py-2"
              title="마지막 삭제한 주문 복구"
            >
              ⏪ Undo
            </Button>
          </div>

          {/* 복구 가능한 주문 정보 표시 */}
          {lastDeletedOrder && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">복구 가능:</span> #
                {lastDeletedOrder.number} (
                {new Date(lastDeletedOrder.createdAt).toLocaleTimeString(
                  "ko-KR"
                )}
                )
              </p>
            </div>
          )}

          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-500">표시된 주문이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-[#2D5FFF]">
                      {order.number}
                    </span>
                    <div className="text-sm text-gray-500">
                      <div>
                        {new Date(order.createdAt).toLocaleTimeString("ko-KR")}
                      </div>
                      {order.expiresAt && (
                        <div className="text-xs">
                          만료:{" "}
                          {new Date(order.expiresAt).toLocaleTimeString(
                            "ko-KR"
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteOrder(order.id)}
                    disabled={!isConnected}
                    title="주문 삭제"
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <footer className="mt-6 text-center text-gray-400 text-sm">
        <div className="flex justify-center items-center gap-6">
          <span>주문 관리 컨트롤러</span>
          <span>활성 주문: {recentOrders.length}개</span>
          <span>Room: {roomId}</span>
          {serverTimeOffset !== 0 && (
            <span>시간 오프셋: {serverTimeOffset}ms</span>
          )}
        </div>
      </footer>
    </div>
  );
}

// Suspense로 감싼 메인 컴포넌트
export default function ControllerPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ControllerContent />
    </Suspense>
  );
}

import React from 'react';
import { Users, CalendarClock, PackageX, CreditCard, ArrowRight } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatCardsProps {
  stats: DashboardStats;
  onSelectTab: (tab: string, filter?: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, onSelectTab }) => {
  const cardData = [
    {
      id: 'subscribers',
      title: '정기구독자 수',
      value: stats.totalSubscribers.toLocaleString(),
      unit: '명',
      subText: '정상 구독 유지 회원',
      icon: Users,
      bgColor: 'bg-white hover:border-slate-300',
      valueColor: 'text-slate-800',
      badge: '+2.4%',
      badgeColor: 'text-green-600 font-bold',
      tabTarget: 'subscribers',
      filter: 'all'
    },
    {
      id: 'expiring',
      title: '이번달 만료 예정',
      value: stats.expiringThisMonth.toLocaleString(),
      unit: '명',
      subText: '구독 만료 대상자',
      icon: CalendarClock,
      bgColor: 'bg-white hover:border-amber-300',
      valueColor: 'text-amber-600',
      badge: '만료 관리',
      badgeColor: 'text-amber-600 font-semibold',
      tabTarget: 'subscribers',
      filter: 'expiring'
    },
    {
      id: 'returns',
      title: '반송 처리 대기',
      value: stats.pendingReturns.toLocaleString(),
      unit: '건',
      subText: '주소불명·수취거절',
      icon: PackageX,
      bgColor: 'bg-white hover:border-red-300',
      valueColor: 'text-red-500',
      badge: '처리기다림',
      badgeColor: 'text-red-600 font-semibold',
      tabTarget: 'returns',
      filter: 'pending'
    },
    {
      id: 'payments',
      title: '입금 미확인',
      value: stats.unconfirmedPayments.toLocaleString(),
      unit: '건',
      subText: '무통장 매칭 대기',
      icon: CreditCard,
      bgColor: 'bg-white hover:border-amber-300',
      valueColor: 'text-amber-500',
      badge: '대조 필요',
      badgeColor: 'text-amber-600 font-semibold',
      tabTarget: 'payments',
      filter: 'unconfirmed'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cardData.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onSelectTab(card.tabTarget, card.filter)}
            className={`group text-left p-5 rounded-xl border border-slate-200 ${card.bgColor} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-extrabold ${card.valueColor} tracking-tight`}>
                  {card.value}
                </span>
                <span className="text-xs text-slate-400 font-medium">{card.unit}</span>
                <span className={`ml-auto text-xs ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{card.subText}</span>
              <span className="flex items-center gap-1 font-bold text-indigo-600 group-hover:underline">
                <span>상세</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

import React from 'react';

export const BRAND_LOGOS = {
  // Logo SmartRoute kèm tagline "Powered by MindTransform"
  smartRoute_full: (
    <svg width="220" height="65" viewBox="0 0 300 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');</style>
        
        {/* Icon: Connected Nodes (Map Cluster) */}
        <g transform="translate(0, 5)">
            <circle cx="15" cy="25" r="6" fill="#2DE1C2"/>
            <circle cx="35" cy="10" r="4" fill="#5B67C9"/>
            <circle cx="35" cy="40" r="4" fill="#5B67C9"/>
            <path d="M15 25 L35 10 M15 25 L35 40" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
        </g>

        {/* Main Text */}
        <text x="50" y="38" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="32" fill="currentColor">Smart</text>
        <text x="148" y="38" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="400" fontSize="32" fill="#2DE1C2">Route</text>
        
        {/* Tagline: Powered by */}
        <text x="52" y="58" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500" fontSize="10" fill="#A0AEC0" letterSpacing="0.5">POWERED BY MINDTRANSFORM</text>
    </svg>
  ),

  // Icon riêng cho SmartRoute (Dùng cho App Icon)
  smartRoute_symbol: (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#020719" stroke="#2DE1C2" strokeWidth="2"/>
        {/* Cluster Icon Centered */}
        <circle cx="35" cy="50" r="10" fill="#2DE1C2"/>
        <circle cx="70" cy="30" r="7" fill="#5B67C9"/>
        <circle cx="70" cy="70" r="7" fill="#5B67C9"/>
        <path d="M35 50 L70 30 M35 50 L70 70" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
};

export const MOCK_ORDERS_CSV = `Order ID,Customer Name,Contact,Delivery Address,Notes,Amount to Collect
ORD-001,Nguyen Van A,0901234567,123 Le Loi District 1,Call before delivery,500000
ORD-002,Tran Thi B,0902345678,456 Nguyen Hue District 1,,250000
ORD-003,Le Van C,0903456789,789 Dien Bien Phu District 3,Office hours only,1200000
ORD-004,Pham Thi D,0904567890,321 Cach Mang Thang 8 District 10,,0
ORD-005,Hoang Van E,0905678901,654 Vo Van Kiet District 5,Fragile,75000
ORD-006,Do Thi F,0906789012,987 Pham Van Dong Thu Duc,,300000
ORD-007,Ngo Van G,0907890123,159 Xa Lo Ha Noi District 2,,150000
ORD-008,Bui Thi H,0908901234,753 Nguyen Van Linh District 7,Leave at reception,450000`;

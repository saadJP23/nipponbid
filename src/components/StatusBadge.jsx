import React from 'react';

const BID_STATUS = {
  pending: { label: 'Pending', class: 'badge-gold' },
  approved: { label: 'Approved', class: 'badge-blue' },
  rejected: { label: 'Rejected', class: 'badge-red' },
  won: { label: 'Won', class: 'badge-green' },
  lost: { label: 'Lost', class: 'badge-gray' },
};

const SHIPPING_STATUS = {
  processing: { label: 'Processing', class: 'badge-gray' },
  in_transit: { label: 'In Transit', class: 'badge-blue' },
  at_port: { label: 'At Port', class: 'badge-orange' },
  customs: { label: 'In Customs', class: 'badge-gold' },
  delivered: { label: 'Delivered', class: 'badge-green' },
};

const PARTS_STATUS = {
  pending: { label: 'Pending', class: 'badge-gold' },
  processing: { label: 'Processing', class: 'badge-blue' },
  ordered: { label: 'Ordered', class: 'badge-blue' },
  shipped: { label: 'Shipped', class: 'badge-orange' },
  delivered: { label: 'Delivered', class: 'badge-green' },
  cancelled: { label: 'Cancelled', class: 'badge-red' },
};

const CAR_STATUS = {
  upcoming: { label: 'Upcoming', class: 'badge-blue' },
  live: { label: 'Live', class: 'badge-green' },
  sold: { label: 'Sold', class: 'badge-gray' },
  unsold: { label: 'Unsold', class: 'badge-red' },
};

const AUCTION_STATUS = {
  upcoming: { label: 'Upcoming', class: 'badge-blue' },
  live: { label: 'Live Now', class: 'badge-green' },
  ended: { label: 'Ended', class: 'badge-gray' },
};

export default function StatusBadge({ status, type = 'bid' }) {
  const maps = { bid: BID_STATUS, shipping: SHIPPING_STATUS, parts: PARTS_STATUS, car: CAR_STATUS, auction: AUCTION_STATUS };
  const map = maps[type] || BID_STATUS;
  const config = map[status] || { label: status, class: 'badge-gray' };
  return <span className={config.class}>{config.label}</span>;
}

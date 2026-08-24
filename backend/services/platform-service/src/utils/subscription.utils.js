export function planEndDate(startDate, planType) {
  const end = new Date(startDate);
  if (planType === 'Weekly') {
    end.setDate(end.getDate() + 7);
  } else if (planType === 'Yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function resolveSubscriptionStatus(endsAt, billingStatus) {
  if (endsAt && endsAt < new Date()) {
    return 'Expired';
  }
  if (billingStatus === 'Paid') {
    return 'Active';
  }
  return 'Pending Payment';
}

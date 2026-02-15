import { makeIndex } from "./lib/utils.js";

const BASE_URL = "https://webinars.webdev.education-services.ru/sp7-api";

export function initData(sourceData) {
  const localSellers = makeIndex(
    sourceData.sellers,
    "id",
    (v) => `${v.first_name} ${v.last_name}`,
  );
  const localCustomers = makeIndex(
    sourceData.customers,
    "id",
    (v) => `${v.first_name} ${v.last_name}`,
  );
  
  const localItems = sourceData.purchase_records.map((item) => ({
    id: item.receipt_id,
    date: item.date,
    seller: localSellers[item.seller_id],
    customer: localCustomers[item.customer_id],
    total: item.total_amount,
  }));

  let sellers;
  let customers;
  let lastResult;
  let lastQuery;

  const mapRecords = (items) =>
    items.map((item) => ({
      id: item.receipt_id,
      date: item.date,
      seller: sellers[item.seller_id],
      customer: customers[item.customer_id],
      total: item.total_amount,
    }));

  const unwrapArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
  };

  const getIndexes = async () => {
    if (!sellers || !customers) {
      const [sellersPayload, customersPayload] = await Promise.all([
        fetch(`${BASE_URL}/sellers`).then((res) => res.json()),
        fetch(`${BASE_URL}/customers`).then((res) => res.json()),
      ]);

      if (Array.isArray(sellersPayload)) {
        sellers = makeIndex(
          sellersPayload,
          "id",
          (v) => `${v.first_name} ${v.last_name}`,
        );
      } else {
        sellers = sellersPayload;
      }

      if (Array.isArray(customersPayload)) {
        customers = makeIndex(
          customersPayload,
          "id",
          (v) => `${v.first_name} ${v.last_name}`,
        );
      } else {
        customers = customersPayload;
      }
    }

    return { sellers, customers };
  };

  const getRecords = async (query, isUpdated = false) => {
    const qs = new URLSearchParams(query);
    const nextQuery = qs.toString();

    if (lastQuery === nextQuery && !isUpdated) {
      return lastResult;
    }

    const response = await fetch(`${BASE_URL}/records?${nextQuery}`);
    const records = await response.json();

    lastQuery = nextQuery;
    lastResult = {
      total: records.total,
      items: mapRecords(records.items),
    };

    return lastResult;
  };

  return {
    getIndexes,
    getRecords,
  };
}

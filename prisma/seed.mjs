import "dotenv/config"
import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client"

import { stockSeedItems, stockSeedStats } from "./stock-seed-data.mjs"

const connectionString = process.env.DATABASE_URL

const prisma = new PrismaClient({
  adapter: new PrismaMssql(connectionString),
})

const organization = {
  id: "org-easyreceipt",
  code: "EASYRECEIPT",
  name: "EasyReceipt Demo",
}

const branches = [
  {
    id: "branch-korat",
    code: "NRS",
    name: "โรงเรียนนครราชสีมาวิทยา",
    location: "นครราชสีมา",
  },
  {
    id: "branch-korat-2",
    code: "NRK",
    name: "โรงเรียนโคราชพิทยาคม",
    location: "เมือง นครราชสีมา",
  },
  {
    id: "branch-pakchong",
    code: "PKC",
    name: "โรงเรียนปากช่องวิทยา",
    location: "ปากช่อง นครราชสีมา",
  },
  {
    id: "branch-suranari",
    code: "SNR",
    name: "โรงเรียนสุรนารีศึกษา",
    location: "เมือง นครราชสีมา",
  },
  {
    id: "branch-bualuang",
    code: "BLN",
    name: "โรงเรียนบัวใหญ่นิยมศาสตร์",
    location: "บัวใหญ่ นครราชสีมา",
  },
  {
    id: "branch-chokechai",
    code: "CCN",
    name: "โรงเรียนโชคชัยพรหมบุตรบริหาร",
    location: "โชคชัย นครราชสีมา",
  },
  {
    id: "branch-sikhio",
    code: "SKN",
    name: "โรงเรียนสีคิ้วสวัสดิ์ผดุงวิทยา",
    location: "สีคิ้ว นครราชสีมา",
  },
  {
    id: "branch-khamthale",
    code: "KTN",
    name: "โรงเรียนคำเตยวิทยา",
    location: "ห้วยแถลง นครราชสีมา",
  },
]

const members = [
  {
    id: "member-owner",
    name: "คุณยานาร์",
    email: "owner@easyreceipt.local",
    role: "owner",
    status: "active",
    primaryBranchId: "branch-korat",
    branchIds: branches.map((branch) => branch.id),
  },
  {
    id: "member-manager",
    name: "พิมพ์ชนก",
    email: "manager@easyreceipt.local",
    role: "manager",
    status: "active",
    primaryBranchId: "branch-korat",
    branchIds: ["branch-korat"],
  },
  {
    id: "member-staff",
    name: "นที",
    email: "staff@easyreceipt.local",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-korat",
    branchIds: ["branch-korat"],
  },
  {
    id: "member-viewer",
    name: "ฝ่ายบัญชี",
    email: "accounting@easyreceipt.local",
    role: "viewer",
    status: "invited",
    primaryBranchId: "branch-korat",
    branchIds: ["branch-korat"],
  },
]

const stockItemById = new Map(
  stockSeedItems.map((item) => [item.id, item])
)

const purchaseDraft = [
  { ingredientId: "stock-0001", quantity: 1 },
  { ingredientId: "stock-0138", quantity: 56 },
  { ingredientId: "stock-0083", quantity: 6 },
  { ingredientId: "stock-0032", quantity: 1 },
  { ingredientId: "stock-0089", quantity: 1.5 },
  { ingredientId: "stock-0127", quantity: 5 },
  { ingredientId: "stock-0043", quantity: 1.5 },
  { ingredientId: "stock-0033", quantity: 0.5 },
]

const recipeTemplatesByBranch = {
  "branch-korat": [
    {
      slug: "basil-chicken",
      name: "ข้าวกะเพราไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 24,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0127", quantity: 4.8 },
        { ingredientId: "stock-0001", quantity: 5 },
        { ingredientId: "stock-0043", quantity: 0.8 },
        { ingredientId: "stock-0033", quantity: 0.25 },
        { ingredientId: "stock-0032", quantity: 0.35 },
        { ingredientId: "stock-0089", quantity: 0.5 },
      ],
    },
    {
      slug: "fried-rice-egg",
      name: "ข้าวผัดไข่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 30,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0001", quantity: 6 },
        { ingredientId: "stock-0138", quantity: 45 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.4 },
      ],
    },
    {
      slug: "tom-yum-soup",
      name: "ต้มยำกุ้ง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 4,
      pricePerServing: 120,
      items: [
        { ingredientId: "stock-0001", quantity: 2 },
        { ingredientId: "stock-0138", quantity: 3 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.2 },
      ],
    },
    {
      slug: "green-curry-chicken",
      name: "แกงเขียวหวานไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 6,
      pricePerServing: 150,
      items: [
        { ingredientId: "stock-0001", quantity: 3 },
        { ingredientId: "stock-0138", quantity: 4 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0127", quantity: 1 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0033", quantity: 0.2 },
      ],
    },
    {
      slug: "pad-thai",
      name: "ผัดไทย",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0138", quantity: 30 },
        { ingredientId: "stock-0083", quantity: 2 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.6 },
        { ingredientId: "stock-0043", quantity: 0.5 },
      ],
    },
    {
      slug: "khao-man-gai",
      name: "ข้าวมันไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.3 },
      ],
    },
  ],
  "branch-korat-2": [
    {
      slug: "fried-rice-pork",
      name: "ข้าวผัดหมู",
      menuCategory: "อาหารจานเดียว",
      servingYield: 28,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0001", quantity: 5.6 },
        { ingredientId: "stock-0127", quantity: 2.8 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.28 },
        { ingredientId: "stock-0089", quantity: 0.42 },
      ],
    },
    {
      slug: "clear-tofu-soup",
      name: "แกงจืดเต้าหู้",
      menuCategory: "อาหารจานเดียว",
      servingYield: 10,
      pricePerServing: 45,
      items: [
        { ingredientId: "stock-0138", quantity: 5 },
        { ingredientId: "stock-0083", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.1 },
      ],
    },
    {
      slug: "tom-kha-chicken",
      name: "ต้มข่าไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 100,
      items: [
        { ingredientId: "stock-0001", quantity: 2 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.4 },
        { ingredientId: "stock-0089", quantity: 0.25 },
        { ingredientId: "stock-0043", quantity: 0.3 },
      ],
    },
    {
      slug: "red-pork-rice",
      name: "ข้าวหมูแดง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0033", quantity: 0.4 },
        { ingredientId: "stock-0032", quantity: 0.3 },
      ],
    },
    {
      slug: "stir-fried-vegetables",
      name: "ผัดผักรวม",
      menuCategory: "อาหารจานเดียว",
      servingYield: 15,
      pricePerServing: 40,
      items: [
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.2 },
        { ingredientId: "stock-0043", quantity: 0.2 },
      ],
    },
    {
      slug: "shrimp-paste-rice",
      name: "ข้าวคลุกกะปิ",
      menuCategory: "อาหารจานเดียว",
      servingYield: 15,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0001", quantity: 3 },
        { ingredientId: "stock-0138", quantity: 8 },
        { ingredientId: "stock-0033", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.3 },
      ],
    },
  ],
  "branch-pakchong": [
    {
      slug: "sour-shrimp-curry",
      name: "แกงส้มกุ้ง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 6,
      pricePerServing: 130,
      items: [
        { ingredientId: "stock-0138", quantity: 6 },
        { ingredientId: "stock-0083", quantity: 1.5 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.35 },
        { ingredientId: "stock-0043", quantity: 0.5 },
      ],
    },
    {
      slug: "chicken-on-rice",
      name: "ข้าวหน้าไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0127", quantity: 3.5 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.35 },
        { ingredientId: "stock-0033", quantity: 0.2 },
      ],
    },
    {
      slug: "red-pork-noodles",
      name: "บะหมี่หมูแดง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 15,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0138", quantity: 12 },
        { ingredientId: "stock-0127", quantity: 2.5 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.25 },
        { ingredientId: "stock-0033", quantity: 0.3 },
      ],
    },
    {
      slug: "fried-chicken-rice",
      name: "ข้าวมันไก่ทอด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 18,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0001", quantity: 3.6 },
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.3 },
      ],
    },
    {
      slug: "pad-see-ew",
      name: "ผัดซีอิ๊ว",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0138", quantity: 20 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.4 },
        { ingredientId: "stock-0043", quantity: 0.4 },
      ],
    },
    {
      slug: "massaman-curry",
      name: "แกงมัสมั่น",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 140,
      items: [
        { ingredientId: "stock-0001", quantity: 2.4 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0127", quantity: 0.8 },
        { ingredientId: "stock-0033", quantity: 0.25 },
      ],
    },
  ],
  "branch-suranari": [
    {
      slug: "seafood-tom-yum",
      name: "ต้มยำทะเล",
      menuCategory: "อาหารจานเดียว",
      servingYield: 6,
      pricePerServing: 130,
      items: [
        { ingredientId: "stock-0138", quantity: 5 },
        { ingredientId: "stock-0083", quantity: 1.5 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.25 },
        { ingredientId: "stock-0043", quantity: 0.5 },
      ],
    },
    {
      slug: "crispy-pork-rice",
      name: "ข้าวหมูกรอบ",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0127", quantity: 3.2 },
        { ingredientId: "stock-0033", quantity: 0.35 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.3 },
      ],
    },
    {
      slug: "minced-pork-basil",
      name: "ผัดกะเพราหมูสับ",
      menuCategory: "อาหารจานเดียว",
      servingYield: 24,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0127", quantity: 4 },
        { ingredientId: "stock-0043", quantity: 0.7 },
        { ingredientId: "stock-0033", quantity: 0.2 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.45 },
      ],
    },
    {
      slug: "red-duck-curry",
      name: "แกงเผ็ดเป็ด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 5,
      pricePerServing: 160,
      items: [
        { ingredientId: "stock-0001", quantity: 2.5 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0127", quantity: 0.8 },
        { ingredientId: "stock-0043", quantity: 0.4 },
      ],
    },
    {
      slug: "pork-congee",
      name: "ข้าวต้มหมู",
      menuCategory: "อาหารจานเดียว",
      servingYield: 12,
      pricePerServing: 45,
      items: [
        { ingredientId: "stock-0001", quantity: 2.4 },
        { ingredientId: "stock-0127", quantity: 1.5 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.15 },
      ],
    },
    {
      slug: "pineapple-fried-rice",
      name: "ข้าวผัดสับปะรด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 16,
      pricePerServing: 70,
      items: [
        { ingredientId: "stock-0001", quantity: 3.2 },
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.35 },
      ],
    },
  ],
  "branch-bualuang": [
    {
      slug: "drunken-noodles",
      name: "ผัดขี้เมา",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0138", quantity: 18 },
        { ingredientId: "stock-0127", quantity: 2.5 },
        { ingredientId: "stock-0043", quantity: 0.6 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.4 },
      ],
    },
    {
      slug: "duck-on-rice",
      name: "ข้าวหน้าเป็ด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 12,
      pricePerServing: 80,
      items: [
        { ingredientId: "stock-0001", quantity: 2.4 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0033", quantity: 0.2 },
      ],
    },
    {
      slug: "guay-jab",
      name: "ก๋วยจั๊บ",
      menuCategory: "อาหารจานเดียว",
      servingYield: 10,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0138", quantity: 8 },
        { ingredientId: "stock-0127", quantity: 2 },
        { ingredientId: "stock-0083", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.2 },
      ],
    },
    {
      slug: "chicken-yellow-curry",
      name: "แกงกะหรี่ไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 120,
      items: [
        { ingredientId: "stock-0001", quantity: 2 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0033", quantity: 0.2 },
      ],
    },
    {
      slug: "bean-sprout-stirfry",
      name: "ผัดถั่วงอก",
      menuCategory: "อาหารจานเดียว",
      servingYield: 15,
      pricePerServing: 35,
      items: [
        { ingredientId: "stock-0138", quantity: 12 },
        { ingredientId: "stock-0083", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.2 },
      ],
    },
    {
      slug: "spicy-veggie-soup",
      name: "แกงเลียง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 50,
      items: [
        { ingredientId: "stock-0138", quantity: 6 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0043", quantity: 0.3 },
      ],
    },
  ],
  "branch-chokechai": [
    {
      slug: "khao-soi",
      name: "ข้าวซอย",
      menuCategory: "อาหารจานเดียว",
      servingYield: 10,
      pricePerServing: 80,
      items: [
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0001", quantity: 2 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.4 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
      ],
    },
    {
      slug: "hang-lay-curry",
      name: "แกงฮังเล",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 150,
      items: [
        { ingredientId: "stock-0127", quantity: 3.2 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.5 },
        { ingredientId: "stock-0089", quantity: 0.35 },
        { ingredientId: "stock-0033", quantity: 0.3 },
        { ingredientId: "stock-0043", quantity: 0.4 },
      ],
    },
    {
      slug: "spicy-chicken-stirfry",
      name: "ผัดเผ็ดไก่",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0043", quantity: 0.7 },
        { ingredientId: "stock-0033", quantity: 0.2 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.45 },
      ],
    },
    {
      slug: "basil-rice-fried-egg",
      name: "ข้าวผัดกะเพราไข่ดาว",
      menuCategory: "อาหารจานเดียว",
      servingYield: 22,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0001", quantity: 4.4 },
        { ingredientId: "stock-0138", quantity: 22 },
        { ingredientId: "stock-0043", quantity: 0.6 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.4 },
      ],
    },
    {
      slug: "shrimp-congee",
      name: "ข้าวต้มกุ้ง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 10,
      pricePerServing: 70,
      items: [
        { ingredientId: "stock-0001", quantity: 2 },
        { ingredientId: "stock-0138", quantity: 6 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.15 },
      ],
    },
    {
      slug: "classic-fried-rice",
      name: "ข้าวผัดโบราณ",
      menuCategory: "อาหารจานเดียว",
      servingYield: 25,
      pricePerServing: 50,
      items: [
        { ingredientId: "stock-0001", quantity: 5 },
        { ingredientId: "stock-0138", quantity: 25 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.35 },
      ],
    },
  ],
  "branch-sikhio": [
    {
      slug: "sour-curry",
      name: "แกงส้ม",
      menuCategory: "อาหารจานเดียว",
      servingYield: 6,
      pricePerServing: 110,
      items: [
        { ingredientId: "stock-0138", quantity: 5 },
        { ingredientId: "stock-0083", quantity: 1.5 },
        { ingredientId: "stock-0032", quantity: 0.45 },
        { ingredientId: "stock-0089", quantity: 0.3 },
        { ingredientId: "stock-0043", quantity: 0.45 },
      ],
    },
    {
      slug: "pumpkin-stirfry",
      name: "ผัดฟักทอง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 12,
      pricePerServing: 45,
      items: [
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0083", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.15 },
        { ingredientId: "stock-0089", quantity: 0.2 },
        { ingredientId: "stock-0127", quantity: 1 },
      ],
    },
    {
      slug: "shrimp-fried-rice",
      name: "ข้าวผัดกุ้ง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0138", quantity: 15 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.4 },
      ],
    },
    {
      slug: "american-fried-rice",
      name: "ข้าวผัดอเมริกัน",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 60,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0138", quantity: 20 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.35 },
        { ingredientId: "stock-0033", quantity: 0.2 },
      ],
    },
    {
      slug: "pork-waterfall",
      name: "น้ำตกหมู",
      menuCategory: "อาหารจานเดียว",
      servingYield: 10,
      pricePerServing: 90,
      items: [
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0033", quantity: 0.3 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.35 },
      ],
    },
    {
      slug: "rice-with-curry",
      name: "ข้าวราดแกง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 25,
      pricePerServing: 50,
      items: [
        { ingredientId: "stock-0001", quantity: 5 },
        { ingredientId: "stock-0083", quantity: 1.5 },
        { ingredientId: "stock-0032", quantity: 0.35 },
        { ingredientId: "stock-0089", quantity: 0.4 },
        { ingredientId: "stock-0127", quantity: 2 },
      ],
    },
  ],
  "branch-khamthale": [
    {
      slug: "vegetarian-noodles",
      name: "ก๋วยเตี๋ยวลุยสวน",
      menuCategory: "อาหารจานเดียว",
      servingYield: 12,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.2 },
        { ingredientId: "stock-0089", quantity: 0.25 },
        { ingredientId: "stock-0043", quantity: 0.3 },
      ],
    },
    {
      slug: "corn-fried-rice",
      name: "ข้าวผัดข้าวโพด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0138", quantity: 14 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.22 },
        { ingredientId: "stock-0089", quantity: 0.38 },
      ],
    },
    {
      slug: "seafood-drunken-stirfry",
      name: "ผัดขี้เมาทะเล",
      menuCategory: "อาหารจานเดียว",
      servingYield: 12,
      pricePerServing: 90,
      items: [
        { ingredientId: "stock-0138", quantity: 10 },
        { ingredientId: "stock-0043", quantity: 0.6 },
        { ingredientId: "stock-0033", quantity: 0.25 },
        { ingredientId: "stock-0032", quantity: 0.3 },
        { ingredientId: "stock-0089", quantity: 0.4 },
      ],
    },
    {
      slug: "garlic-pork-rice",
      name: "ข้าวหน้าทอดกระเทียม",
      menuCategory: "อาหารจานเดียว",
      servingYield: 20,
      pricePerServing: 65,
      items: [
        { ingredientId: "stock-0001", quantity: 4 },
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.3 },
      ],
    },
    {
      slug: "mushroom-tom-yum",
      name: "ต้มยำเห็ด",
      menuCategory: "อาหารจานเดียว",
      servingYield: 8,
      pricePerServing: 80,
      items: [
        { ingredientId: "stock-0138", quantity: 6 },
        { ingredientId: "stock-0083", quantity: 1 },
        { ingredientId: "stock-0032", quantity: 0.4 },
        { ingredientId: "stock-0089", quantity: 0.2 },
        { ingredientId: "stock-0043", quantity: 0.4 },
      ],
    },
    {
      slug: "curry-paste-stirfry",
      name: "ผัดพริกแกง",
      menuCategory: "อาหารจานเดียว",
      servingYield: 15,
      pricePerServing: 55,
      items: [
        { ingredientId: "stock-0127", quantity: 3 },
        { ingredientId: "stock-0043", quantity: 0.5 },
        { ingredientId: "stock-0033", quantity: 0.25 },
        { ingredientId: "stock-0032", quantity: 0.25 },
        { ingredientId: "stock-0089", quantity: 0.35 },
      ],
    },
  ],
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

async function clearDatabase(tx) {
  await tx.auditLog.deleteMany()
  await tx.stockMovement.deleteMany()
  await tx.cookingRun.deleteMany()
  await tx.stockReservation.deleteMany()
  await tx.recipePlan.deleteMany()
  await tx.recipeItem.deleteMany()
  await tx.recipe.deleteMany()
  await tx.purchaseItem.deleteMany()
  await tx.purchase.deleteMany()
  await tx.branchInventory.deleteMany()
  await tx.ingredient.deleteMany()
  await tx.memberBranchAccess.deleteMany()
  await tx.member.deleteMany()
  await tx.branch.deleteMany()
  await tx.organization.deleteMany()
}

async function seedBranchWorkspace(tx, branch, branchIndex, templates) {
  const inventoryByIngredient = new Map()
  const reservationTotals = new Map()
  const purchaseQuantityByIngredient = new Map(
    purchaseDraft.map((item) => [item.ingredientId, item.quantity])
  )

  for (const item of stockSeedItems) {
    const purchaseQuantity = purchaseQuantityByIngredient.get(item.id) ?? 0
    const startingOnHand = Math.max(
      Number(item.inventory.onHand) - purchaseQuantity,
      0
    )
    const row = await tx.branchInventory.create({
      data: {
        branchId: branch.id,
        ingredientId: item.id,
        onHand: round(startingOnHand),
        reorderPoint: round(item.inventory.reorderPoint),
        costPerUnit: round(item.inventory.costPerUnit, 2),
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
    inventoryByIngredient.set(item.id, row)
  }

  const purchaseItems = purchaseDraft.map((item) => {
    const ingredient = stockItemById.get(item.ingredientId)

    if (!ingredient) {
      throw new Error(`Missing stock seed item: ${item.ingredientId}`)
    }

    const unitPrice = round(ingredient.defaultPrice, 2)
    const quantity = round(item.quantity)

    return {
      ingredientId: item.ingredientId,
      quantity,
      unit: ingredient.unit,
      unitPrice,
      lineTotal: round(quantity * unitPrice, 2),
    }
  })

  const purchase = await tx.purchase.create({
    data: {
      id: `${branch.id}-purchase-demo`,
      branchId: branch.id,
      createdByMemberId: "member-owner",
      purchaseDate: new Date("2026-06-27T08:00:00+07:00"),
      vendor: "ใบซื้อเริ่มต้น",
      status: "posted",
      totalAmount: round(
        purchaseItems.reduce((total, item) => total + item.lineTotal, 0),
        2
      ),
    },
  })

  for (const item of purchaseItems) {
    const purchaseItem = await tx.purchaseItem.create({
      data: {
        ...item,
        purchaseId: purchase.id,
      },
    })
    const before = Number(inventoryByIngredient.get(item.ingredientId).onHand)
    const after = round(before + item.quantity)

    await tx.branchInventory.update({
      where: {
        branchId_ingredientId: {
          branchId: branch.id,
          ingredientId: item.ingredientId,
        },
      },
      data: {
        onHand: after,
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
    inventoryByIngredient.set(item.ingredientId, {
      ...inventoryByIngredient.get(item.ingredientId),
      onHand: after,
    })

    await tx.stockMovement.create({
      data: {
        branchId: branch.id,
        ingredientId: item.ingredientId,
        purchaseItemId: purchaseItem.id,
        createdByMemberId: "member-owner",
        movementType: "purchase_in",
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitPrice,
        beforeQuantity: before,
        afterQuantity: after,
        referenceType: "purchase",
        referenceId: purchase.id,
      },
    })
  }

  for (const template of templates) {
    const recipe = await tx.recipe.create({
      data: {
        id: `${branch.id}-recipe-${template.slug}`,
        branchId: branch.id,
        name: template.name,
        menuCategory: template.menuCategory,
        servingYield: template.servingYield + branchIndex * 2,
        pricePerServing: template.pricePerServing + branchIndex * 5,
        items: {
          create: template.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    const plan = await tx.recipePlan.create({
      data: {
        id: `${recipe.id}-plan`,
        branchId: branch.id,
        recipeId: recipe.id,
        plannedByMemberId: "member-owner",
        status: "pinned",
        batchCount: 1,
      },
    })

    for (const recipeItem of recipe.items) {
      await tx.stockReservation.create({
        data: {
          branchId: branch.id,
          recipePlanId: plan.id,
          ingredientId: recipeItem.ingredientId,
          quantity: recipeItem.quantity,
          status: "active",
        },
      })

      reservationTotals.set(
        recipeItem.ingredientId,
        round(
          (reservationTotals.get(recipeItem.ingredientId) ?? 0) +
            Number(recipeItem.quantity)
        )
      )
    }
  }

  for (const [ingredientId, reservedQuantity] of reservationTotals.entries()) {
    await tx.branchInventory.update({
      where: {
        branchId_ingredientId: {
          branchId: branch.id,
          ingredientId,
        },
      },
      data: {
        reservedQuantity,
      },
    })
  }
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      await clearDatabase(tx)

      await tx.organization.create({
        data: organization,
      })

      for (const branch of branches) {
        await tx.branch.create({
          data: {
            ...branch,
            organizationId: organization.id,
          },
        })
      }

      for (const member of members) {
        await tx.member.create({
          data: {
            id: member.id,
            organizationId: organization.id,
            primaryBranchId: member.primaryBranchId,
            name: member.name,
            email: member.email,
            passwordHash: "prototype:123456",
            role: member.role,
            status: member.status,
            joinedAt: new Date("2026-06-01T08:00:00+07:00"),
          },
        })

        for (const branchId of member.branchIds) {
          await tx.memberBranchAccess.create({
            data: {
              memberId: member.id,
              branchId,
            },
          })
        }
      }

      for (const ingredient of stockSeedItems) {
        await tx.ingredient.create({
          data: {
            id: ingredient.id,
            organizationId: organization.id,
            name: ingredient.name,
            category: ingredient.category,
            unit: ingredient.unit,
            defaultPrice: ingredient.defaultPrice,
            supplier: ingredient.supplier,
          },
        })
      }

      for (const [index, branch] of branches.entries()) {
        const templates = recipeTemplatesByBranch[branch.id]
        await seedBranchWorkspace(tx, branch, index, templates)
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          memberId: "member-owner",
          action: "seed",
          entityType: "database",
          entityId: organization.id,
          metadataJson: JSON.stringify({
            branches: branches.length,
            ingredients: stockSeedItems.length,
            recipesPerBranch: 6,
            skippedStockRows: stockSeedStats.skippedRows,
          }),
        },
      })
    },
    {
      timeout: 120000,
    }
  )
}

main()
  .then(async () => {
    console.log("EasyReceipt MSSQL seed completed.")
  })
  .catch(async (error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

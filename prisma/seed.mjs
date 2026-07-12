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
    id: "branch-wat-sakaeo",
    code: "WSK",
    name: "โรงเรียนวัดสระแก้ว",
    location: "อำเภอเมืองนครราชสีมา",
  },
  {
    id: "branch-keha",
    code: "KHA",
    name: "โรงเรียนเคหะ",
    location: "อำเภอเมืองนครราชสีมา",
  },
  {
    id: "branch-ban-khok-sung",
    code: "BKS",
    name: "โรงเรียนบ้านโคกสูง",
    location: "อำเภอโคกสูง",
  },
  {
    id: "branch-chokchai",
    code: "CKC",
    name: "โรงเรียนโชคชัย",
    location: "อำเภอโชคชัย",
  },
  {
    id: "branch-chakkarat",
    code: "CKR",
    name: "โรงเรียนจักราช",
    location: "อำเภอจักราช",
  },
  {
    id: "branch-kham-thale-so",
    code: "KTS",
    name: "โรงเรียนขามทะเลสอ",
    location: "อำเภอขามทะเลสอ",
  },
  {
    id: "branch-huai-thalaeng",
    code: "HTL",
    name: "โรงเรียนห้วยแถลง",
    location: "อำเภอห้วยแถลง",
  },
  {
    id: "branch-school-total",
    code: "ALL",
    name: "งานโรงเรียนรวม",
    location: "รวมทุกโรงเรียน",
  },
]

const members = [
  {
    id: "member-owner",
    name: "Owner",
    username: "owner",
    role: "owner",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: branches.map((branch) => branch.id),
  },
  {
    id: "member-manager",
    name: "Manager",
    username: "manager",
    role: "manager",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff",
    name: "Staff",
    username: "staff",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff-1",
    name: "Staff1",
    username: "staff1",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff-2",
    name: "Staff2",
    username: "staff2",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-keha",
    branchIds: ["branch-keha"],
  },
  {
    id: "member-staff-3",
    name: "Staff3",
    username: "staff3",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-ban-khok-sung",
    branchIds: ["branch-ban-khok-sung"],
  },
  {
    id: "member-staff-4",
    name: "Staff4",
    username: "staff4",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-chokchai",
    branchIds: ["branch-chokchai"],
  },
  {
    id: "member-staff-5",
    name: "Staff5",
    username: "staff5",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-chakkarat",
    branchIds: ["branch-chakkarat"],
  },
  {
    id: "member-staff-6",
    name: "Staff6",
    username: "staff6",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-kham-thale-so",
    branchIds: ["branch-kham-thale-so"],
  },
  {
    id: "member-staff-7",
    name: "Staff7",
    username: "staff7",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-huai-thalaeng",
    branchIds: ["branch-huai-thalaeng"],
  },
  {
    id: "member-staff-8",
    name: "Staff8",
    username: "staff8",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-school-total",
    branchIds: ["branch-school-total"],
  },
]

const recipeTemplatesByBranch = {
  "branch-wat-sakaeo": [
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
  "branch-keha": [
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
  "branch-ban-khok-sung": [
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
  "branch-chokchai": [
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
  "branch-chakkarat": [
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
  "branch-kham-thale-so": [
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
  "branch-huai-thalaeng": [
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
  "branch-school-total": [
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
  for (const item of stockSeedItems) {
    await tx.branchInventory.create({
      data: {
        branchId: branch.id,
        ingredientId: item.id,
        onHand: 0,
        reorderPoint: round(item.inventory.reorderPoint),
        costPerUnit: round(item.inventory.costPerUnit, 2),
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
  }

  for (const template of templates) {
    await tx.recipe.create({
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
    })
  }

  await tx.branchInventory.updateMany({
    where: {
      branchId: branch.id,
    },
    data: {
      onHand: 0,
      lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
    },
  })
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
            username: member.username,
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

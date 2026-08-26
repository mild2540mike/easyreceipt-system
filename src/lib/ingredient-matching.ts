export type IngredientSearchCandidate<T> = {
  item: T
  name: string
  fields: string[]
}

export type RankedIngredientSearchCandidate<T> = IngredientSearchCandidate<T> & {
  isApproximate: boolean
  score: number
}

const packagingQualifierPattern =
  /(?:ถุง|แพค|แพ็ค|แพ็ก|pack|package|ขนาด|ไซซ์|size|ใหญ่|เล็ก|กลาง|จัมโบ้|jumbo|\d+(?:[.,]\d+)?\s*(?:กก|กิโลกรัม|กรัม|มล|มิลลิลิตร|ลิตร|ชิ้น|ถุง|ขวด|กระป๋อง|กล่อง|แพค|แพ็ค|แพ็ก))/iu

const trailingPackagingPattern =
  /\s+(?:(?:ถุง|แพค|แพ็ค|แพ็ก|pack)\s*(?:ใหญ่|เล็ก|กลาง|จัมโบ้|jumbo)|(?:ขนาด|ไซซ์|size)\s*\S+(?:\s*\S+)?|\d+(?:[.,]\d+)?\s*(?:กก|กิโลกรัม|กรัม|มล|มิลลิลิตร|ลิตร|ชิ้น|ถุง|ขวด|กระป๋อง|กล่อง|แพค|แพ็ค|แพ็ก))$/iu

export function normalizeIngredientMatchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"'\\|<>?+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeIngredientMatchCore(value: string) {
  const withoutTrailingBracket = value.replace(
    /\s*[([{（]([^\])}）]{1,80})[\])}）]\s*$/u,
    (segment, qualifier: string) =>
      packagingQualifierPattern.test(normalizeIngredientMatchText(qualifier))
        ? ""
        : segment
  )

  return normalizeIngredientMatchText(withoutTrailingBracket)
    .replace(trailingPackagingPattern, "")
    .replace(/\s/g, "")
    .trim()
}

function levenshteinDistance(left: string, right: string) {
  const leftCharacters = Array.from(left)
  const rightCharacters = Array.from(right)
  let previous = rightCharacters.map((_, index) => index + 1)

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex + 1]

    for (let rightIndex = 0; rightIndex < rightCharacters.length; rightIndex += 1) {
      const substitutionCost =
        leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1

      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost
      ))
    }

    previous = current
  }

  return previous[rightCharacters.length] ?? leftCharacters.length
}

export function ingredientNameSimilarityScore(query: string, name: string) {
  const normalizedQuery = normalizeIngredientMatchText(query)
  const normalizedName = normalizeIngredientMatchText(name)

  if (!normalizedQuery || !normalizedName) {
    return 0
  }

  if (normalizedQuery === normalizedName) {
    return 100
  }

  const queryCore = normalizeIngredientMatchCore(query)
  const nameCore = normalizeIngredientMatchCore(name)
  const queryLength = Array.from(queryCore).length
  const nameLength = Array.from(nameCore).length
  const shortestLength = Math.min(queryLength, nameLength)
  const longestLength = Math.max(queryLength, nameLength)

  if (shortestLength < 4 || longestLength === 0) {
    return 0
  }

  if (queryCore === nameCore) {
    return 98
  }

  const containmentRatio = shortestLength / longestLength

  if (
    containmentRatio >= 0.65 &&
    (queryCore.includes(nameCore) || nameCore.includes(queryCore))
  ) {
    return Math.round(85 + containmentRatio * 10)
  }

  const similarity = 1 - levenshteinDistance(queryCore, nameCore) / longestLength

  return similarity >= 0.7 ? Math.round(similarity * 100) : 0
}

export function rankIngredientSearchCandidates<T>(
  query: string,
  candidates: IngredientSearchCandidate<T>[]
): RankedIngredientSearchCandidate<T>[] {
  const searchTerm = normalizeIngredientMatchText(query)

  if (!searchTerm) {
    return candidates
      .map((candidate) => ({ ...candidate, isApproximate: false, score: 0 }))
      .sort((left, right) => left.name.localeCompare(right.name, "th"))
  }

  return candidates
    .map((candidate) => {
      const normalizedName = normalizeIngredientMatchText(candidate.name)
      const normalizedFields = candidate.fields.map(normalizeIngredientMatchText)
      let literalScore = 0

      if (normalizedName === searchTerm) {
        literalScore = 400
      } else if (normalizedName.startsWith(searchTerm)) {
        literalScore = 350
      } else if (normalizedName.includes(searchTerm)) {
        literalScore = 300
      } else if (normalizedFields.some((field) => field.includes(searchTerm))) {
        literalScore = 250
      }

      const similarityScore = ingredientNameSimilarityScore(query, candidate.name)

      return {
        ...candidate,
        isApproximate: literalScore === 0 && similarityScore >= 70,
        score: literalScore || similarityScore,
      }
    })
    .filter((candidate) => candidate.score >= 70)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      return left.name.localeCompare(right.name, "th")
    })
}

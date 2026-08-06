const scale = 3;

export function score(rank, percent, minPercent, totalLevels) {
    if (rank > totalLevels) {
        return 0;
    }

    // Bottom half requires 100%
    if (rank > totalLevels / 2 && percent < 100) {
        return 0;
    }

    const normalizedRank = (rank - 1) / (totalLevels - 1);

    const minScore = 3;

    let baseScore =
        minScore +
        (200 - minScore) *
        (1 - Math.pow(normalizedRank, 0.4));

    let score =
        baseScore *
        ((percent - (minPercent - 1)) /
            (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!("" + num).includes("e")) {
        return +(Math.round(num + "e+" + scale) + "e-" + scale);
    } else {
        var arr = ("" + num).split("e");
        var sig = "";

        if (+arr[1] + scale > 0) {
            sig = "+";
        }

        return +(
            Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) +
            "e-" +
            scale
        );
    }
}
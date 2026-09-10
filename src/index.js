const decimal_to_fraction = (a) => {
    let n = (""+a).split(".")[1].length
    let frac = [a, 1]
    frac.forEach((x, i) => {
        frac[i] = x * Math.pow(10, n)
    })
    return frac
}

const fraction_reducer = (a, b) => {
    let gcd = (a, b) => {
        if (b==0){
            return a
        }
        return gcd(b, a%b)
    }

    let gcd_val = gcd(a, b)
    let frac = [a, b]
    frac.forEach((x, i) => {
        frac[i] = x / gcd_val
    })

    return frac
}

let frac = [6, 4]

console.log(fraction_reducer(...decimal_to_fraction(1.5)))
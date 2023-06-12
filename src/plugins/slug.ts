declare var XRegExp: any;

export type MakeSlugOptions = {
	delimiter?: string;
	lowercase?: boolean;
	replacements?: { [key: string]: string };
	transliterate?: boolean;
	limit?: number;
};

export const makeSlug = (input: string, opt: MakeSlugOptions = {}) => {
	if (!input) throw new Error(`"input" argument is required.`);

	// convert any input type to string ;)
	let str = `${input}`;

	var defaults: MakeSlugOptions = {
		delimiter: "-",
		lowercase: true,
		replacements: {},
		transliterate: typeof XRegExp === "undefined" ? true : false,
	};

	// Merge options
	for (var l in defaults) {
		if (!opt.hasOwnProperty(l)) opt[l] = defaults[l];
	}

	var char_map: { [key: string]: any } = {
		// Latin
		À: "A",
		Á: "A",
		Â: "A",
		Ã: "A",
		Ä: "A",
		Å: "A",
		Æ: "AE",
		Ç: "C",
		È: "E",
		É: "E",
		Ê: "E",
		Ë: "E",
		Ì: "I",
		Í: "I",
		Î: "I",
		Ï: "I",
		Ð: "D",
		Ñ: "N",
		Ò: "O",
		Ó: "O",
		Ô: "O",
		Õ: "O",
		Ö: "O",
		Ő: "O",
		Ø: "O",
		Ù: "U",
		Ú: "U",
		Û: "U",
		Ü: "U",
		Ű: "U",
		Ý: "Y",
		Þ: "TH",
		ß: "ss",
		à: "a",
		á: "a",
		â: "a",
		ã: "a",
		ä: "a",
		å: "a",
		æ: "ae",
		ç: "c",
		è: "e",
		é: "e",
		ê: "e",
		ë: "e",
		ì: "i",
		í: "i",
		î: "i",
		ï: "i",
		ð: "d",
		ñ: "n",
		ò: "o",
		ó: "o",
		ô: "o",
		õ: "o",
		ö: "o",
		ő: "o",
		ø: "o",
		ù: "u",
		ú: "u",
		û: "u",
		ü: "u",
		ű: "u",
		ý: "y",
		þ: "th",
		ÿ: "y",

		// Latin symbols
		"©": "(c)",

		// Greek
		Α: "A",
		Β: "B",
		Γ: "G",
		Δ: "D",
		Ε: "E",
		Ζ: "Z",
		Η: "H",
		Θ: "8",
		Ι: "I",
		Κ: "K",
		Λ: "L",
		Μ: "M",
		Ν: "N",
		Ξ: "3",
		Ο: "O",
		Π: "P",
		Ρ: "R",
		Σ: "S",
		Τ: "T",
		Υ: "Y",
		Φ: "F",
		Χ: "X",
		Ψ: "PS",
		Ω: "W",
		Ά: "A",
		Έ: "E",
		Ί: "I",
		Ό: "O",
		Ύ: "Y",
		Ή: "H",
		Ώ: "W",
		Ϊ: "I",
		Ϋ: "Y",
		α: "a",
		β: "b",
		γ: "g",
		δ: "d",
		ε: "e",
		ζ: "z",
		η: "h",
		θ: "8",
		ι: "i",
		κ: "k",
		λ: "l",
		μ: "m",
		ν: "n",
		ξ: "3",
		ο: "o",
		π: "p",
		ρ: "r",
		σ: "s",
		τ: "t",
		υ: "y",
		φ: "f",
		χ: "x",
		ψ: "ps",
		ω: "w",
		ά: "a",
		έ: "e",
		ί: "i",
		ό: "o",
		ύ: "y",
		ή: "h",
		ώ: "w",
		ς: "s",
		ϊ: "i",
		ΰ: "y",
		ϋ: "y",
		ΐ: "i",

		// Turkish
		Ş: "S",
		İ: "I",
		Ğ: "G",
		ş: "s",
		ı: "i",
		ğ: "g",

		// Russian
		А: "A",
		Б: "B",
		В: "V",
		Г: "G",
		Д: "D",
		Е: "E",
		Ё: "Yo",
		Ж: "Zh",
		З: "Z",
		И: "I",
		Й: "J",
		К: "K",
		Л: "L",
		М: "M",
		Н: "N",
		О: "O",
		П: "P",
		Р: "R",
		С: "S",
		Т: "T",
		У: "U",
		Ф: "F",
		Х: "H",
		Ц: "C",
		Ч: "Ch",
		Ш: "Sh",
		Щ: "Sh",
		Ъ: "",
		Ы: "Y",
		Ь: "",
		Э: "E",
		Ю: "Yu",
		Я: "Ya",
		а: "a",
		б: "b",
		в: "v",
		г: "g",
		д: "d",
		е: "e",
		ё: "yo",
		ж: "zh",
		з: "z",
		и: "i",
		й: "j",
		к: "k",
		л: "l",
		м: "m",
		н: "n",
		о: "o",
		п: "p",
		р: "r",
		с: "s",
		т: "t",
		у: "u",
		ф: "f",
		х: "h",
		ц: "c",
		ч: "ch",
		ш: "sh",
		щ: "sh",
		ъ: "",
		ы: "y",
		ь: "",
		э: "e",
		ю: "yu",
		я: "ya",

		// Ukrainian
		Є: "Ye",
		І: "I",
		Ї: "Yi",
		Ґ: "G",
		є: "ye",
		і: "i",
		ї: "yi",
		ґ: "g",

		// Czech
		Č: "C",
		Ď: "D",
		Ě: "E",
		Ň: "N",
		Ř: "R",
		Š: "S",
		Ť: "T",
		Ů: "U",
		Ž: "Z",
		č: "c",
		ď: "d",
		ě: "e",
		ň: "n",
		ř: "r",
		š: "s",
		ť: "t",
		ů: "u",
		ž: "z",

		// Polish
		Ą: "A",
		Ć: "C",
		Ę: "e",
		Ł: "L",
		Ń: "N",
		Ś: "S",
		Ź: "Z",
		Ż: "Z",
		ą: "a",
		ć: "c",
		ę: "e",
		ł: "l",
		ń: "n",
		ś: "s",
		ź: "z",
		ż: "z",

		// Latvian
		Ā: "A",
		Ē: "E",
		Ģ: "G",
		Ī: "i",
		Ķ: "k",
		Ļ: "L",
		Ņ: "N",
		Ū: "u",
		ā: "a",
		ē: "e",
		ģ: "g",
		ī: "i",
		ķ: "k",
		ļ: "l",
		ņ: "n",
		ū: "u",
	};

	// Vietnamese
	str = str.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, "a");
	str = str.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, "e");
	str = str.replace(/i|í|ì|ỉ|ĩ|ị/gi, "i");
	str = str.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, "o");
	str = str.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, "u");
	str = str.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, "y");
	str = str.replace(/đ/gi, "d");
	str = str.replace(/\-\-\-\-\-/gi, "-");
	str = str.replace(/\-\-\-\-/gi, "-");
	str = str.replace(/\-\-\-/gi, "-");
	str = str.replace(/\-\-/gi, "-");
	str = "@" + str + "@";
	str = str.replace(/\@\-|\-\@|\@/gi, "");

	// Make custom replacements
	for (var k in opt.replacements) str = str.replace(RegExp(k, "g"), opt.replacements[k]);

	// Transliterate characters to ASCII
	if (opt.transliterate) for (var m in char_map) str = str.replace(RegExp(m, "g"), char_map[m]);

	// Replace non-alphanumeric characters with our delimiter
	var alnum = typeof XRegExp === "undefined" ? RegExp("[^a-z0-9]+", "ig") : XRegExp("[^\\p{L}\\p{N}]+", "ig");
	str = str.replace(alnum, opt.delimiter);

	// Remove duplicate delimiters
	str = str.replace(RegExp("[" + opt.delimiter + "]{2,}", "g"), opt.delimiter);

	// Truncate slug to max. characters
	if (typeof opt.limit !== "undefined") str = str.substring(0, opt.limit);

	// Remove delimiter from ends
	str = str.replace(RegExp("(^" + opt.delimiter + "|" + opt.delimiter + "$)", "g"), "");

	return opt.lowercase ? str.toLowerCase() : str;
};

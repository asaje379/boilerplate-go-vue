import { cancel, isCancel, password, text } from "@clack/prompts";

export async function prompt(promise) {
  const result = await promise;
  if (isCancel(result)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  return result;
}

export async function promptNumber(message, defaultValue) {
  const result = await prompt(
    text({
      defaultValue: String(defaultValue),
      message,
      validate(value) {
        const number = Number(value);
        return Number.isInteger(number) && number > 0 ? undefined : "Enter a positive integer";
      },
    }),
  );

  return Number(result);
}

export async function promptEmail(message, defaultValue) {
  return prompt(
    text({
      defaultValue,
      message,
      validate(value) {
        return value.includes("@") ? undefined : "Enter a valid email";
      },
    }),
  );
}

export async function promptSecret(message, minLength, defaultValue) {
  return prompt(
    password({
      message,
      ...(defaultValue ? { mask: "*" } : {}),
      validate(value) {
        return value.length >= minLength ? undefined : `Must be at least ${minLength} characters`;
      },
    }),
  );
}

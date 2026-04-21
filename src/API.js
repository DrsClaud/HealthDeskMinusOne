import firebaseApp from "services/firebase";
import { useForm } from "react-hook-form";

const BaseUrl =
  process.env.REACT_APP_ENV === "production"
    ? "https://us-central1-hlthdsk.cloudfunctions.net/api/"
    : "https://us-central1-caremap2020.cloudfunctions.net/api/";
//const BaseUrl = "http://localhost:238/";//
const CreateNewApiToken = () => {
  return new Promise((resolve, reject) => {
    firebaseApp
      .auth()
      .currentUser.getIdToken(/* forceRefresh */ true)
      .then((idToken) => {
        fetch(BaseUrl + "create_api_token/", {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ token: idToken }),
        })
          .then((data) => {
            resolve(data);
          })
          .catch((error) => {
            reject(error);
          });
      });
  });
};

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
const ocrIdCard = (file) =>
  new Promise((resolve, reject) => {
    const image = toBase64(file).then((base64) => {
      base64 = base64.split("base64,")[1];
      fetch(BaseUrl + "google_vision", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [
                {
                  type: "TEXT_DETECTION",
                },
              ],
            },
          ],
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          resolve(data);
        })
        .catch((data) => reject(data));
    });
  });

//const ApiLoginForm = () => {
//    const { handleSubmit, register, errors } = useForm({ mode: "onBlur" });
//
//    const onSubmit = ({ email, password }) => {
//        setLoading(true);
//
//        // Create user and create database entry for user/booklist
//        firebaseApp
//            .auth()
//            .signInWithEmailAndPassword(email, password)
//            .then(() => {
//                return <Navigate to="/dashboard" />;
//            })
//            .catch((error) => {
//                setLoading(false);
//                setFirebaseErrors(error.message);
//            });
//    };
//    return (
//
//        <form onSubmit={handleSubmit(onSubmit)}>
//            <InputWrapper>
//                <Label htmlFor="email">Email</Label>
//                <Input
//                    name="email"
//                    id="email"
//                    type="email"
//                    ref={register({
//                        required: "Email is required.",
//                        pattern: {
//                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
//                            message: "Invalid email address.",
//                        },
//                    })}
//                />
//                {errors.email && <Error>{errors.email.message}</Error>}
//            </InputWrapper>
//
//            <InputWrapper>
//                <Label htmlFor="password">Password</Label>
//                <Input
//                    name="password"
//                    id="password"
//                    type="password"
//                    ref={register({ required: "Password is required." })}
//                />
//                {errors.password && (
//                    <Error>{errors.password.message}</Error>
//                )}
//            </InputWrapper>
//
//            {firebaseErrors && <Error>{firebaseErrors}</Error>}
//            <Button type="submit" disabled={loading}>
//                {loading ? <Loading /> : "Log In"}
//            </Button>
//        </form>
//
//    )
//}
//  const LoginForToken = () => {
//      return new Promise((resolve, reject) => {
//      firebaseApp
//          .auth()
//          .signInWithEmailAndPassword(email, password)
//          .then(() => {
//              return <Navigate to="/dashboard" />;
//          })
//          .catch((error) => {
//              setLoading(false);
//              setFirebaseErrors(error.message);
//          });
//      });
//  }

export { BaseUrl, CreateNewApiToken, ocrIdCard };

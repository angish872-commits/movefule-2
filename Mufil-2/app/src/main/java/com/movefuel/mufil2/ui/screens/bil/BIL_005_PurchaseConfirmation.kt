package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL005PurchaseConfirmationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_005",
        title = "Purchase Confirmation",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_004,
        onNavigate = onNavigate,
    ) {
            MFNotice("Confirm purchase","The platform purchase sheet handles the actual transaction.")
            MFListItem("Selected plan","Pro","Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL005PurchaseConfirmationScreenPreview() {
    MoveFuelTheme { BIL005PurchaseConfirmationScreen {} }
}

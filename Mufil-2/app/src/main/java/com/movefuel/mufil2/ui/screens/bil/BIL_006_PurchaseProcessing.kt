package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL006PurchaseProcessingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_006",
        title = "Purchase Processing",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_005,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Opening platform purchase","Waiting for confirmation","Verifying entitlement"),1)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL006PurchaseProcessingScreenPreview() {
    MoveFuelTheme { BIL006PurchaseProcessingScreen {} }
}

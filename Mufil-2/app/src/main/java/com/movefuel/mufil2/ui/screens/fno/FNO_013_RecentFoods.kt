package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO013RecentFoodsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_013",
        title = "Recent Foods",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_012,
        onNavigate = onNavigate,
    ) {
            MFNotice("No recent confirmed foods", "Confirmed history will appear here after the shared intake confirmation boundary is committed.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO013RecentFoodsScreenPreview() {
    MoveFuelTheme { FNO013RecentFoodsScreen {} }
}
